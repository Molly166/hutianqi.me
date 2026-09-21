export interface ExperienceEntry {
  id: string;
  moduleId: string;
  /** A real calendar date in YYYY-MM-DD format. */
  date: string;
  title?: string;
  text?: string;
  textEn?: string;
  images?: Array<{ src: string; alt: string }>;
}

export interface ExperienceStore {
  version: 1;
  modules: Array<{ id: string; label: string }>;
  entries: ExperienceEntry[];
}

export type ExperiencePatch = Partial<Omit<ExperienceEntry, "id">>;

function requireObject(value: unknown, context: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, context: string, nonempty = false): string {
  if (typeof value !== "string" || (nonempty && value.trim().length === 0)) {
    throw new Error(`${context} must be a ${nonempty ? "nonempty " : ""}string.`);
  }
  return value;
}

function requireKnownFields(
  value: Record<string, unknown>,
  fields: readonly string[],
  context: string,
): void {
  for (const key of Object.keys(value)) {
    if (!fields.includes(key)) {
      throw new Error(`${context} has an unsupported field ${JSON.stringify(key)}.`);
    }
  }
}

function validateExperienceDate(value: unknown): string {
  if (typeof value !== "string" || value.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid experience date ${JSON.stringify(value)}: expected YYYY-MM-DD.`);
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new Error(`Invalid experience date ${JSON.stringify(value)}: not a real calendar date.`);
  }
  return value;
}

function validateImageSource(value: unknown, context: string): string {
  const src = requireString(value, context, true);
  const hasControlCharacter = Array.from(src).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || (code >= 127 && code <= 159);
  });
  const hasInvalidCharacters = /\s/u.test(src) || hasControlCharacter || src.includes("\\");
  const isRootRelative = src.startsWith("/") && !src.startsWith("//");
  let isHttpUrl = false;

  if (/^https?:\/\/[^/?#]/i.test(src)) {
    try {
      const url = new URL(src);
      isHttpUrl = (url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0;
    } catch {
      // A malformed absolute URL should fail with the same contextual validation error.
    }
  }

  if (hasInvalidCharacters || (!isRootRelative && !isHttpUrl)) {
    throw new Error(
      `${context} must be a root-relative path beginning with a single / or a valid absolute http(s) URL, without whitespace, control characters, or backslashes.`,
    );
  }
  return src;
}

/** Validate the portable store and return an independent copy of its contents. */
export function validateExperienceStore(store: unknown): ExperienceStore {
  const source = requireObject(store, "Experience store");
  requireKnownFields(source, ["version", "modules", "entries"], "Experience store");
  if (source.version !== 1) {
    throw new Error("Experience store version must be 1.");
  }
  if (!Array.isArray(source.modules) || !Array.isArray(source.entries)) {
    throw new Error("Experience store modules and entries must be arrays.");
  }

  const moduleIds = new Set<string>();
  const modules = source.modules.map((value, index) => {
    const context = `Experience module at index ${index}`;
    const moduleRecord = requireObject(value, context);
    requireKnownFields(moduleRecord, ["id", "label"], context);
    const id = requireString(moduleRecord.id, `${context} id`, true);
    const label = requireString(moduleRecord.label, `${context} label`, true);
    if (moduleIds.has(id)) {
      throw new Error(`Duplicate experience module id ${JSON.stringify(id)}.`);
    }
    moduleIds.add(id);
    return { id, label };
  });

  const entryIds = new Set<string>();
  const entries = source.entries.map((value, index): ExperienceEntry => {
    const context = `Experience entry at index ${index}`;
    const entry = requireObject(value, context);
    requireKnownFields(entry, ["id", "moduleId", "date", "title", "text", "textEn", "images"], context);
    const id = requireString(entry.id, `${context} id`, true);
    if (entryIds.has(id)) {
      throw new Error(`Duplicate experience entry id ${JSON.stringify(id)}.`);
    }
    entryIds.add(id);
    const moduleId = requireString(entry.moduleId, `Experience entry ${JSON.stringify(id)} moduleId`, true);
    if (!moduleIds.has(moduleId)) {
      throw new Error(`Unknown experience module ${JSON.stringify(moduleId)} for entry ${JSON.stringify(id)}.`);
    }
    const date = validateExperienceDate(entry.date);
    const result: ExperienceEntry = { id, moduleId, date };

    if (entry.title !== undefined) {
      result.title = requireString(entry.title, `Experience entry ${JSON.stringify(id)} title`);
    }
    if (entry.text !== undefined) {
      result.text = requireString(entry.text, `Experience entry ${JSON.stringify(id)} text`);
    }
    if (entry.textEn !== undefined) {
      result.textEn = requireString(entry.textEn, `Experience entry ${JSON.stringify(id)} textEn`);
    }
    if (entry.images !== undefined) {
      if (!Array.isArray(entry.images)) {
        throw new Error(`Experience entry ${JSON.stringify(id)} images must be an array.`);
      }
      result.images = entry.images.map((value, imageIndex) => {
        const imageContext = `Experience entry ${JSON.stringify(id)} image at index ${imageIndex}`;
        const image = requireObject(value, imageContext);
        requireKnownFields(image, ["src", "alt"], imageContext);
        return {
          src: validateImageSource(image.src, `${imageContext} src`),
          alt: requireString(image.alt, `${imageContext} alt`),
        };
      });
    }
    if (!result.title?.trim() && !result.text?.trim() && !result.textEn?.trim() && !result.images?.length) {
      throw new Error(`Experience entry ${JSON.stringify(id)} must contain a title, text, or at least one image.`);
    }
    return result;
  });

  return { version: 1, modules, entries };
}

/** List all entries or one registered module, oldest first and stable for equal dates. */
export function listExperiences(store: ExperienceStore, moduleId?: string): ExperienceEntry[] {
  const validated = validateExperienceStore(store);
  if (moduleId !== undefined && !validated.modules.some(({ id }) => id === moduleId)) {
    throw new Error(`Unknown experience module ${JSON.stringify(moduleId)}.`);
  }

  return validated.entries
    .map((entry, inputIndex) => ({ entry, inputIndex }))
    .filter(({ entry }) => moduleId === undefined || entry.moduleId === moduleId)
    .sort((a, b) => {
      if (a.entry.date < b.entry.date) return -1;
      if (a.entry.date > b.entry.date) return 1;
      return a.inputIndex - b.inputIndex;
    })
    .map(({ entry }) => entry);
}

export function addExperience(store: ExperienceStore, entry: ExperienceEntry): ExperienceStore {
  const validated = validateExperienceStore(store);
  return validateExperienceStore({ ...validated, entries: [...validated.entries, entry] });
}

export function updateExperience(
  store: ExperienceStore,
  id: string,
  patch: ExperiencePatch,
): ExperienceStore {
  const validated = validateExperienceStore(store);
  const updates = requireObject(patch, "Experience update");
  if ("id" in updates) {
    throw new Error("An experience update cannot change its id.");
  }
  requireKnownFields(updates, ["moduleId", "date", "title", "text", "textEn", "images"], "Experience update");
  const index = validated.entries.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new Error(`Experience entry ${JSON.stringify(id)} was not found.`);
  }
  validated.entries[index] = { ...validated.entries[index], ...updates };
  return validateExperienceStore(validated);
}

export function removeExperience(store: ExperienceStore, id: string): ExperienceStore {
  const validated = validateExperienceStore(store);
  const index = validated.entries.findIndex((entry) => entry.id === id);
  if (index < 0) {
    throw new Error(`Experience entry ${JSON.stringify(id)} was not found.`);
  }
  validated.entries.splice(index, 1);
  return validated;
}

/** Render a date consistently in every timezone. */
export function formatExperienceDate(date: string): string {
  return validateExperienceDate(date).replaceAll("-", ".");
}
