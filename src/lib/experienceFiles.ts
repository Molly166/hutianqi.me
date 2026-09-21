import {
  lstatSync,
  readFileSync,
  readdirSync,
  type Dirent,
} from "node:fs";
import {
  isAbsolute,
  relative,
  resolve,
} from "node:path";

import {
  EXPERIENCE_MODULES,
  isExperienceModuleId,
  type ExperienceModuleId,
} from "../data/experienceModules.ts";
import {
  validateExperienceStore,
  type ExperienceEntry,
  type ExperienceStore,
} from "./experiences.ts";

export const DEFAULT_EXPERIENCES_ROOT = resolve(process.cwd(), "src/data/experiences");
export const EXPERIENCE_FILE_STEM_PATTERN = /^\d{4}-\d{2}-\d{2}(?:-(?:0[1-9]|[1-9]\d))?$/;

const EXPERIENCE_FILE_FIELDS = ["id", "date", "title", "text", "textEn", "images"] as const;

export type ExperienceFileData = Omit<ExperienceEntry, "moduleId">;

export interface ExperienceFileRecord {
  path: string;
  fileName: string;
  moduleId: ExperienceModuleId;
  entry: ExperienceEntry;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPathInside(parent: string, candidate: string): boolean {
  const pathFromParent = relative(parent, candidate);
  return pathFromParent !== "" && !pathFromParent.startsWith("..") && !isAbsolute(pathFromParent);
}

function assertKnownModuleId(moduleId: string): asserts moduleId is ExperienceModuleId {
  if (!isExperienceModuleId(moduleId)) {
    throw new Error(`Unknown experience module ${JSON.stringify(moduleId)}.`);
  }
}

/** Validate a complete event filename and return it unchanged. */
export function validateExperienceFileName(fileName: string): string {
  if (typeof fileName !== "string" || !fileName.endsWith(".json")) {
    throw new Error(`Invalid experience filename ${JSON.stringify(fileName)}: expected a .json file.`);
  }

  const stem = fileName.slice(0, -".json".length);
  if (!EXPERIENCE_FILE_STEM_PATTERN.test(stem)) {
    throw new Error(
      `Invalid experience filename ${JSON.stringify(fileName)}: the stem must match ${EXPERIENCE_FILE_STEM_PATTERN}.`,
    );
  }
  return fileName;
}

/** Return the sortable date prefix from a validated event filename. */
export function experienceDateFromFileName(fileName: string): string {
  validateExperienceFileName(fileName);
  return fileName.slice(0, 10);
}

/** Derive the canonical global entry ID from its module and filename. */
export function experienceIdFromFileName(moduleId: string, fileName: string): string {
  assertKnownModuleId(moduleId);
  validateExperienceFileName(fileName);
  return `${moduleId}-${fileName.slice(0, -".json".length)}`;
}

/** Resolve a validated event filename beneath one known module directory. */
export function experienceFilePath(
  rootDir: string,
  moduleId: string,
  fileName: string,
): string {
  assertKnownModuleId(moduleId);
  const moduleDir = resolve(rootDir, moduleId);
  const filePath = resolve(moduleDir, fileName);
  if (!isPathInside(moduleDir, filePath)) {
    throw new Error(`Experience file ${JSON.stringify(filePath)} is outside its module directory.`);
  }
  try {
    validateExperienceFileName(fileName);
  } catch (error) {
    throw new Error(
      `Invalid experience file ${JSON.stringify(filePath)}: ${errorMessage(error)}`,
      { cause: error },
    );
  }
  return filePath;
}

function requireFileData(value: unknown, filePath: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid experience file ${JSON.stringify(filePath)}: its JSON value must be an object.`);
  }

  const data = value as Record<string, unknown>;
  for (const field of Object.keys(data)) {
    if (!EXPERIENCE_FILE_FIELDS.includes(field as (typeof EXPERIENCE_FILE_FIELDS)[number])) {
      throw new Error(
        `Invalid experience file ${JSON.stringify(filePath)}: unsupported field ${JSON.stringify(field)}.`,
      );
    }
  }
  return data;
}

/** Parse and validate one event body, inferring its module from the caller. */
export function parseExperienceFile(
  source: string,
  moduleId: string,
  filePath = "<experience file>",
): ExperienceEntry {
  assertKnownModuleId(moduleId);

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    throw new Error(
      `Invalid JSON in experience file ${JSON.stringify(filePath)}: ${errorMessage(error)}`,
      { cause: error },
    );
  }

  const data = requireFileData(parsed, filePath);
  try {
    return validateExperienceStore({
      version: 1,
      modules: EXPERIENCE_MODULES,
      entries: [{ ...data, moduleId }],
    }).entries[0];
  } catch (error) {
    throw new Error(
      `Invalid experience file ${JSON.stringify(filePath)}: ${errorMessage(error)}`,
      { cause: error },
    );
  }
}

/** Return the portable on-disk fields for one validated entry. */
export function experienceFileData(entry: ExperienceEntry): ExperienceFileData {
  let validated: ExperienceEntry;
  try {
    validated = validateExperienceStore({
      version: 1,
      modules: EXPERIENCE_MODULES,
      entries: [entry],
    }).entries[0];
  } catch (error) {
    throw new Error(`Cannot serialize experience entry: ${errorMessage(error)}`, { cause: error });
  }

  const data: ExperienceFileData = { id: validated.id, date: validated.date };
  if (validated.title !== undefined) data.title = validated.title;
  if (validated.text !== undefined) data.text = validated.text;
  if (validated.textEn !== undefined) data.textEn = validated.textEn;
  if (validated.images !== undefined) data.images = validated.images;
  return data;
}

/** Serialize one event with stable formatting and a trailing newline. */
export function serializeExperienceFile(entry: ExperienceEntry): string {
  return `${JSON.stringify(experienceFileData(entry), null, 2)}\n`;
}

function sortedEntries(directory: string): Dirent[] {
  return readdirSync(directory, { withFileTypes: true }).sort((a, b) => {
    // Ignore the shared extension so a bare date sorts before its same-day suffixes.
    const aKey = a.name.endsWith(".json") ? a.name.slice(0, -".json".length) : a.name;
    const bKey = b.name.endsWith(".json") ? b.name.slice(0, -".json".length) : b.name;
    return aKey < bKey ? -1 : aKey > bKey ? 1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
  });
}

function assertNoNestedJson(directory: string, moduleDir: string): void {
  for (const child of sortedEntries(directory)) {
    if (child.name.startsWith(".")) continue;

    const childPath = resolve(directory, child.name);
    if (!isPathInside(moduleDir, childPath)) {
      throw new Error(`Experience path ${JSON.stringify(childPath)} is outside its module directory.`);
    }

    if (child.isSymbolicLink()) {
      if (child.name.endsWith(".json")) {
        throw new Error(`Experience JSON file ${JSON.stringify(childPath)} must not be a symbolic link.`);
      }
      continue;
    }
    if (child.isDirectory()) {
      assertNoNestedJson(childPath, moduleDir);
    } else if (child.name.endsWith(".json")) {
      throw new Error(
        `Experience JSON file ${JSON.stringify(childPath)} must be a direct child of its module directory.`,
      );
    }
  }
}

function scanModule(rootDir: string, moduleId: ExperienceModuleId): ExperienceFileRecord[] {
  const moduleDir = resolve(rootDir, moduleId);
  let moduleStat;
  try {
    moduleStat = lstatSync(moduleDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error(
      `Cannot inspect experience module directory ${JSON.stringify(moduleDir)}: ${errorMessage(error)}`,
      { cause: error },
    );
  }

  if (moduleStat.isSymbolicLink()) {
    throw new Error(`Experience module directory ${JSON.stringify(moduleDir)} must not be a symbolic link.`);
  }
  if (!moduleStat.isDirectory()) {
    throw new Error(`Experience module path ${JSON.stringify(moduleDir)} must be a directory.`);
  }

  const records: ExperienceFileRecord[] = [];
  for (const child of sortedEntries(moduleDir)) {
    if (child.name.startsWith(".") || !child.name.endsWith(".json")) {
      if (!child.name.startsWith(".") && child.isDirectory()) {
        assertNoNestedJson(resolve(moduleDir, child.name), moduleDir);
      }
      continue;
    }

    const filePath = experienceFilePath(rootDir, moduleId, child.name);
    if (child.isSymbolicLink()) {
      throw new Error(`Experience JSON file ${JSON.stringify(filePath)} must not be a symbolic link.`);
    }
    if (!child.isFile() || !lstatSync(filePath).isFile()) {
      throw new Error(`Experience JSON file ${JSON.stringify(filePath)} must be an ordinary file.`);
    }

    const entry = parseExperienceFile(readFileSync(filePath, "utf8"), moduleId, filePath);
    const filenameDate = experienceDateFromFileName(child.name);
    if (filenameDate !== entry.date) {
      throw new Error(
        `Invalid experience file ${JSON.stringify(filePath)}: filename date ${JSON.stringify(filenameDate)} must match entry date ${JSON.stringify(entry.date)}.`,
      );
    }
    const expectedId = experienceIdFromFileName(moduleId, child.name);
    if (entry.id !== expectedId) {
      throw new Error(
        `Invalid experience file ${JSON.stringify(filePath)}: entry id must be ${JSON.stringify(expectedId)}, received ${JSON.stringify(entry.id)}.`,
      );
    }
    records.push({ path: filePath, fileName: child.name, moduleId, entry });
  }
  return records;
}

function validateRecords(records: ExperienceFileRecord[]): ExperienceStore {
  try {
    return validateExperienceStore({
      version: 1,
      modules: EXPERIENCE_MODULES,
      entries: records.map(({ entry }) => entry),
    });
  } catch (error) {
    const paths = records.map(({ path }) => JSON.stringify(path)).join(", ");
    throw new Error(
      `Invalid experience collection${paths ? ` from ${paths}` : ""}: ${errorMessage(error)}`,
      { cause: error },
    );
  }
}

/**
 * Load source-aware records in deterministic module order, then filename-stem order.
 * Only direct, ordinary JSON files in known module directories are considered.
 */
export function loadExperienceFiles(rootDir = DEFAULT_EXPERIENCES_ROOT): ExperienceFileRecord[] {
  const resolvedRoot = resolve(rootDir);
  const records = EXPERIENCE_MODULES.flatMap(({ id }) => scanModule(resolvedRoot, id));
  const validated = validateRecords(records);

  return records.map((record, index) => ({
    ...record,
    entry: validated.entries[index],
  }));
}

/** Load the complete portable store from the per-event files on disk. */
export function loadExperienceStore(rootDir = DEFAULT_EXPERIENCES_ROOT): ExperienceStore {
  const records = loadExperienceFiles(rootDir);
  return validateExperienceStore({
    version: 1,
    modules: EXPERIENCE_MODULES,
    entries: records.map(({ entry }) => entry),
  });
}
