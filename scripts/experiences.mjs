#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFile, lstat, open, rename, unlink } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { EXPERIENCE_MODULES } from "../src/data/experienceModules.ts";
import {
  addExperience,
  listExperiences,
  removeExperience,
  updateExperience,
  validateExperienceStore,
} from "../src/lib/experiences.ts";
import {
  DEFAULT_EXPERIENCES_ROOT,
  experienceIdFromFileName,
  experienceFilePath,
  loadExperienceFiles,
  serializeExperienceFile,
  validateExperienceFileName,
} from "../src/lib/experienceFiles.ts";

const usage = `Manage local experience notes (Node 22+).

  node --experimental-strip-types scripts/experiences.mjs list [--module school]
  node --experimental-strip-types scripts/experiences.mjs add --module school --input note.json
  node --experimental-strip-types scripts/experiences.mjs update --module school --id ID --input patch.json
  node --experimental-strip-types scripts/experiences.mjs remove --module school --id ID

Options:
  --root PATH    Use a different experience directory (default: src/data/experiences).
  --dry-run      Validate a mutation and print the result without saving it.
  --help         Show this help.

Input paths are relative to the current working directory. Each saved JSON file
contains one event. Images are referenced by their site URLs; this command does
not upload or delete image files.`;

function parseArguments(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === "--help")) return null;
  const [command, ...flags] = args;
  const allowed = {
    list: ["module", "root"],
    add: ["module", "input", "root", "dry-run"],
    update: ["module", "id", "input", "root", "dry-run"],
    remove: ["module", "id", "root", "dry-run"],
  };
  if (!Object.hasOwn(allowed, command)) throw new Error(`Unknown command: ${command}. Use --help.`);

  const options = {};
  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];
    const key = flag.startsWith("--") ? flag.slice(2) : "";
    if (!allowed[command].includes(key)) throw new Error(`Unsupported option for ${command}: ${flag}.`);
    if (Object.hasOwn(options, key)) throw new Error(`Duplicate option: ${flag}.`);
    if (key === "dry-run") {
      options[key] = true;
      continue;
    }
    const value = flags[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}.`);
    options[key] = value;
    index += 1;
  }

  const required = {
    list: [],
    add: ["module", "input"],
    update: ["module", "id", "input"],
    remove: ["module", "id"],
  };
  for (const key of required[command]) {
    if (!options[key]) throw new Error(`Missing required option --${key} for ${command}.`);
  }
  return { command, options };
}

function parseJson(source, path) {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${error.message}`);
  }
}

async function readInput(path) {
  const resolvedPath = resolve(path);
  const value = parseJson(await readFile(resolvedPath, "utf8"), resolvedPath);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Input must be a JSON object.");
  }
  return value;
}

function requireKnownFields(value, allowedFields, context) {
  for (const key of Object.keys(value)) {
    if (!allowedFields.includes(key)) {
      throw new Error(`${context} has an unsupported field ${JSON.stringify(key)}.`);
    }
  }
}

function storeFromRecords(records) {
  return validateExperienceStore({
    version: 1,
    modules: EXPERIENCE_MODULES.map((module) => ({ ...module })),
    entries: records.map(({ entry }) => entry),
  });
}

function findScopedRecord(records, id, moduleId) {
  const record = records.find(({ entry }) => entry.id === id);
  if (!record) throw new Error(`Experience entry ${JSON.stringify(id)} was not found.`);
  if (record.moduleId !== moduleId) {
    throw new Error(`Experience entry ${JSON.stringify(id)} belongs to module ${record.moduleId}, not ${moduleId}.`);
  }
  return record;
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function requireRegularFile(path) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink() || !metadata.isFile()) {
    throw new Error(`Experience file must be a regular file, not a directory or symbolic link: ${path}`);
  }
  return metadata;
}

async function requireRegularDirectory(path) {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
    throw new Error(`Experience root must be a regular directory, not a file or symbolic link: ${path}`);
  }
}

function slotForIndex(moduleId, date, index) {
  if (!Number.isInteger(index) || index < 0 || index > 99) {
    throw new Error(`A single date supports at most 100 experience files in one module: ${moduleId} ${date}.`);
  }
  const suffix = index === 0 ? "" : `-${String(index).padStart(2, "0")}`;
  const stem = `${date}${suffix}`;
  const fileName = `${stem}.json`;
  validateExperienceFileName(fileName);
  return { fileName, id: experienceIdFromFileName(moduleId, fileName), suffix };
}

async function chooseAvailableSlot(rootPath, moduleId, date, store, preferredIndex) {
  const indexes = [];
  if (preferredIndex !== undefined) indexes.push(preferredIndex);
  for (let index = 0; index <= 99; index += 1) {
    if (index !== preferredIndex) indexes.push(index);
  }

  for (const index of indexes) {
    const slot = slotForIndex(moduleId, date, index);
    const path = experienceFilePath(rootPath, moduleId, slot.fileName);
    const idExists = store.entries.some(({ id }) => id === slot.id);
    if (!idExists && !(await pathExists(path))) return { ...slot, path };
  }
  throw new Error(`No free experience filename remains for ${moduleId} on ${date}.`);
}

function suffixIndex(fileName) {
  const stem = fileName.slice(0, -".json".length);
  return stem.length === 10 ? 0 : Number(stem.slice(11));
}

function updateWithDerivedId(store, oldId, patch, newId) {
  return validateExperienceStore({
    ...store,
    entries: store.entries.map((entry) => (
      entry.id === oldId ? { ...entry, ...patch, id: newId } : entry
    )),
  });
}

async function writeTemporaryFile(path, source, mode) {
  const temporaryPath = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let temporaryFile;
  try {
    temporaryFile = await open(temporaryPath, "wx", mode);
    await temporaryFile.writeFile(source, "utf8");
    await temporaryFile.sync();
    await temporaryFile.close();
    return temporaryPath;
  } catch (error) {
    if (temporaryFile) await temporaryFile.close();
    await unlink(temporaryPath).catch((cleanupError) => {
      if (cleanupError.code !== "ENOENT") throw cleanupError;
    });
    throw error;
  }
}

async function assertFileUnchanged(path, originalSource) {
  await requireRegularFile(path);
  if (await readFile(path, "utf8") !== originalSource) {
    throw new Error(`Experience file changed during this operation. Review it and retry: ${path}`);
  }
}

async function writeNewFileAtomically(path, source) {
  const temporaryPath = await writeTemporaryFile(path, source, 0o644);
  try {
    if (await pathExists(path)) {
      throw new Error(`Experience file already exists and will not be overwritten: ${path}`);
    }
    await rename(temporaryPath, path);
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function replaceFileAtomically(sourcePath, targetPath, source, originalSource, mode) {
  const temporaryPath = await writeTemporaryFile(targetPath, source, mode);
  let publishedTarget = false;
  try {
    await assertFileUnchanged(sourcePath, originalSource);
    if (targetPath !== sourcePath && await pathExists(targetPath)) {
      throw new Error(`Experience file already exists and will not be overwritten: ${targetPath}`);
    }
    await rename(temporaryPath, targetPath);
    publishedTarget = targetPath !== sourcePath;
    if (publishedTarget) await unlink(sourcePath);
  } catch (error) {
    if (publishedTarget) {
      await unlink(targetPath).catch((cleanupError) => {
        if (cleanupError.code !== "ENOENT") throw cleanupError;
      });
    }
    throw error;
  } finally {
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function removeFileIfUnchanged(path, originalSource) {
  await assertFileUnchanged(path, originalSource);
  await unlink(path);
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (!parsed) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const { command, options } = parsed;
  const rootPath = resolve(options.root ?? DEFAULT_EXPERIENCES_ROOT);
  await requireRegularDirectory(rootPath);
  const records = loadExperienceFiles(rootPath);
  const store = storeFromRecords(records);

  // Besides filtering, this validates the requested module even if it is empty.
  const entries = listExperiences(store, options.module);
  if (command === "list") {
    process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
    return;
  }

  let nextStore;
  let resultEntry;
  let resultFile;
  let sourceFile;
  let originalSource;
  let originalMode;
  let previousId;
  let previousFile;

  if (command === "add") {
    const input = await readInput(options.input);
    requireKnownFields(input, ["id", "date", "title", "text", "images"], "Experience input");
    const hasExplicitId = Object.hasOwn(input, "id");
    const validationId = randomUUID();
    const validatedInputStore = addExperience(store, {
      ...input,
      id: validationId,
      moduleId: options.module,
    });
    const validatedInput = validatedInputStore.entries.find(({ id }) => id === validationId);
    const slot = await chooseAvailableSlot(rootPath, options.module, validatedInput.date, store);
    if (hasExplicitId && input.id !== slot.id) {
      throw new Error(`Experience input id must be ${JSON.stringify(slot.id)} for the next available file ${slot.fileName}.`);
    }
    const entry = {
      ...validatedInput,
      id: slot.id,
    };
    nextStore = addExperience(store, entry);
    resultEntry = nextStore.entries.find((candidate) => candidate.id === entry.id);
    resultFile = slot.path;
  } else {
    const record = findScopedRecord(records, options.id, options.module);
    sourceFile = record.path;
    previousId = record.entry.id;
    previousFile = record.path;
    const metadata = await requireRegularFile(sourceFile);
    originalMode = metadata.mode & 0o777;
    originalSource = await readFile(sourceFile, "utf8");

    if (command === "update") {
      const patch = await readInput(options.input);
      if (Object.keys(patch).length === 0) throw new Error("Update input must contain at least one field.");
      requireKnownFields(patch, ["date", "title", "text", "images"], "Experience update");
      const contentUpdatedStore = updateExperience(store, options.id, patch);
      const contentUpdatedEntry = contentUpdatedStore.entries.find((candidate) => candidate.id === options.id);
      if (contentUpdatedEntry.date !== record.entry.date) {
        const storeWithoutCurrent = removeExperience(store, options.id);
        const slot = await chooseAvailableSlot(
          rootPath,
          record.moduleId,
          contentUpdatedEntry.date,
          storeWithoutCurrent,
          suffixIndex(record.fileName),
        );
        nextStore = updateWithDerivedId(contentUpdatedStore, options.id, {}, slot.id);
        resultEntry = nextStore.entries.find((candidate) => candidate.id === slot.id);
        resultFile = slot.path;
      } else {
        nextStore = updateExperience(store, options.id, patch);
        resultEntry = nextStore.entries.find((candidate) => candidate.id === options.id);
        resultFile = record.path;
      }
    } else {
      nextStore = removeExperience(store, options.id);
      resultEntry = record.entry;
      resultFile = sourceFile;
    }
  }

  if (!options["dry-run"]) {
    if (command === "add") {
      await writeNewFileAtomically(resultFile, serializeExperienceFile(resultEntry));
    } else if (command === "update") {
      await replaceFileAtomically(
        sourceFile,
        resultFile,
        serializeExperienceFile(resultEntry),
        originalSource,
        originalMode,
      );
    } else {
      await removeFileIfUnchanged(sourceFile, originalSource);
    }
  }

  process.stdout.write(`${JSON.stringify({
    operation: command,
    dryRun: Boolean(options["dry-run"]),
    root: rootPath,
    ...(command === "update" ? { previousId, previousFile } : {}),
    file: resultFile,
    entry: resultEntry,
    totalEntries: nextStore.entries.length,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Experience error: ${error.message}\n`);
  process.exitCode = 1;
});
