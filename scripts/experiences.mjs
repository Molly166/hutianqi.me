#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { readFile, lstat, open, rename, unlink } from "node:fs/promises";
import { dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  addExperience,
  listExperiences,
  removeExperience,
  updateExperience,
  validateExperienceStore,
} from "../src/lib/experiences.ts";

const defaultStore = fileURLToPath(new URL("../src/data/experiences.json", import.meta.url));
const usage = `Manage local experience notes (Node 22+).

  node --experimental-strip-types scripts/experiences.mjs list [--module school]
  node --experimental-strip-types scripts/experiences.mjs add --module school --input note.json
  node --experimental-strip-types scripts/experiences.mjs update --module school --id ID --input patch.json
  node --experimental-strip-types scripts/experiences.mjs remove --module school --id ID

Options:
  --store PATH   Use a different existing JSON store (default: src/data/experiences.json).
  --dry-run      Validate a mutation and print the result without saving it.
  --help        Show this help.

Input paths are relative to the current working directory. Images are referenced by
their site URLs; this command does not upload or delete image files.`;

function parseArguments(args) {
  if (args.length === 0 || (args.length === 1 && args[0] === "--help")) return null;
  const [command, ...flags] = args;
  const allowed = {
    list: ["module", "store"],
    add: ["module", "input", "store", "dry-run"],
    update: ["module", "id", "input", "store", "dry-run"],
    remove: ["module", "id", "store", "dry-run"],
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

function requireMatchingModule(input, moduleId) {
  if (Object.hasOwn(input, "moduleId") && input.moduleId !== moduleId) {
    throw new Error(`Input moduleId must match --module ${moduleId}.`);
  }
}

function findScopedEntry(store, id, moduleId) {
  const entry = store.entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Experience entry ${JSON.stringify(id)} was not found.`);
  if (entry.moduleId !== moduleId) {
    throw new Error(`Experience entry ${JSON.stringify(id)} belongs to module ${entry.moduleId}, not ${moduleId}.`);
  }
  return entry;
}

async function writeStoreAtomically(path, store, originalSource, mode) {
  const temporaryPath = resolve(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  let temporaryFile;
  try {
    temporaryFile = await open(temporaryPath, "wx", mode);
    await temporaryFile.writeFile(`${JSON.stringify(store, null, 2)}\n`, "utf8");
    await temporaryFile.sync();
    await temporaryFile.close();
    temporaryFile = undefined;

    // Avoid replacing edits made since this operation loaded the store.
    if (await readFile(path, "utf8") !== originalSource) {
      throw new Error("Experience store changed during this operation. Review it and retry.");
    }
    await rename(temporaryPath, path);
  } finally {
    if (temporaryFile) await temporaryFile.close();
    await unlink(temporaryPath).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

async function main() {
  const parsed = parseArguments(process.argv.slice(2));
  if (!parsed) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const { command, options } = parsed;
  const storePath = options.store ? resolve(options.store) : defaultStore;
  const metadata = await lstat(storePath);
  if (!metadata.isFile()) throw new Error("Experience store must be a regular JSON file, not a directory or symbolic link.");
  const originalSource = await readFile(storePath, "utf8");
  const store = validateExperienceStore(parseJson(originalSource, storePath));

  // Besides filtering, this validates the requested module even if it is empty.
  const entries = listExperiences(store, options.module);
  if (command === "list") {
    process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
    return;
  }

  let nextStore;
  let resultEntry;
  if (command === "add") {
    const input = await readInput(options.input);
    requireMatchingModule(input, options.module);
    const entry = {
      ...input,
      id: Object.hasOwn(input, "id") ? input.id : randomUUID(),
      moduleId: options.module,
    };
    nextStore = addExperience(store, entry);
    resultEntry = nextStore.entries.find((candidate) => candidate.id === entry.id);
  } else {
    const existing = findScopedEntry(store, options.id, options.module);
    if (command === "update") {
      const patch = await readInput(options.input);
      if (Object.keys(patch).length === 0) throw new Error("Update input must contain at least one field.");
      requireMatchingModule(patch, options.module);
      nextStore = updateExperience(store, options.id, patch);
      resultEntry = nextStore.entries.find((candidate) => candidate.id === options.id);
    } else {
      nextStore = removeExperience(store, options.id);
      resultEntry = existing;
    }
  }

  if (!options["dry-run"]) {
    await writeStoreAtomically(storePath, nextStore, originalSource, metadata.mode & 0o777);
  }
  process.stdout.write(`${JSON.stringify({
    operation: command,
    dryRun: Boolean(options["dry-run"]),
    store: storePath,
    entry: resultEntry,
    totalEntries: nextStore.entries.length,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`Experience error: ${error.message}\n`);
  process.exitCode = 1;
});
