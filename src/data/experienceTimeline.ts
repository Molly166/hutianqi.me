import {
  EXPERIENCE_MODULES,
  type ExperienceModuleId,
} from "./experienceModules.ts";
import {
  listExperiences,
  type ExperienceEntry,
} from "../lib/experiences.ts";

export interface ExperienceMonth {
  id: string;
  year: number;
  month: number;
  label: string;
  entries: readonly ExperienceEntry[];
}

export interface ExperienceDay extends ExperienceMonth {
  day: number;
}

export interface ExperienceMonthRange {
  start: { year: number; month: number };
  end: { year: number; month: number };
}

function monthIndex({ year, month }: { year: number; month: number }) {
  if (!Number.isInteger(year) || year < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid experience month ${JSON.stringify({ year, month })}.`);
  }
  return year * 12 + month - 1;
}

export function sortExperienceEntries(
  entries: readonly ExperienceEntry[],
  moduleId: ExperienceModuleId,
): ExperienceEntry[] {
  return listExperiences(
    {
      version: 1,
      modules: [...EXPERIENCE_MODULES],
      entries: [...entries],
    },
    moduleId,
  );
}

/** Group one registered content module by month and extend the range for real entries. */
export function buildExperienceMonths(
  entries: readonly ExperienceEntry[],
  moduleId: ExperienceModuleId,
  range: ExperienceMonthRange,
): ExperienceMonth[] {
  let rangeStart = monthIndex(range.start);
  let rangeEnd = monthIndex(range.end);
  if (rangeStart > rangeEnd) {
    throw new Error("Experience month range start must not be after its end.");
  }

  const entriesByMonth = new Map<string, ExperienceEntry[]>();
  for (const entry of sortExperienceEntries(entries, moduleId)) {
    const id = entry.date.slice(0, 7);
    const entryMonthIndex = Number(entry.date.slice(0, 4)) * 12 + Number(entry.date.slice(5, 7)) - 1;
    rangeStart = Math.min(rangeStart, entryMonthIndex);
    rangeEnd = Math.max(rangeEnd, entryMonthIndex);
    const monthEntries = entriesByMonth.get(id) ?? [];
    monthEntries.push(entry);
    entriesByMonth.set(id, monthEntries);
  }

  return Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => {
    const currentMonthIndex = rangeStart + index;
    const year = Math.floor(currentMonthIndex / 12);
    const month = (currentMonthIndex % 12) + 1;
    const id = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    return {
      id,
      year,
      month,
      label: `${year}年${month}月`,
      entries: entriesByMonth.get(id) ?? [],
    };
  });
}

/** Group one registered content module by each real date that has content. */
export function buildExperienceDays(
  entries: readonly ExperienceEntry[],
  moduleId: ExperienceModuleId,
): ExperienceDay[] {
  const entriesByDay = new Map<string, ExperienceEntry[]>();

  for (const entry of sortExperienceEntries(entries, moduleId)) {
    const dayEntries = entriesByDay.get(entry.date) ?? [];
    dayEntries.push(entry);
    entriesByDay.set(entry.date, dayEntries);
  }

  return Array.from(entriesByDay, ([id, dayEntries]) => {
    const year = Number(id.slice(0, 4));
    const month = Number(id.slice(5, 7));
    const day = Number(id.slice(8, 10));
    return {
      id,
      year,
      month,
      day,
      label: `${year}年${month}月${day}日`,
      entries: dayEntries,
    };
  });
}
