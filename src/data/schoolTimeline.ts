import storedExperiences from "./experiences.json" with { type: "json" };
import {
  listExperiences,
  validateExperienceStore,
  type ExperienceEntry,
} from "../lib/experiences.ts";

export { formatExperienceDate as formatSchoolEntryDate } from "../lib/experiences.ts";
export type SchoolExperienceEntry = ExperienceEntry;

export interface SchoolMonth {
  id: string;
  year: number;
  month: number;
  label: string;
  entries: readonly SchoolExperienceEntry[];
}

export interface SchoolYear {
  year: number;
  startIndex: number;
  count: number;
}

/**
 * 真实内容统一保存在 experiences.json；这里只选择学校模块并自动归月、排序。
 * 默认显示 2023 年 9 月至 2026 年 9 月，超出范围的新经历会自动延伸时间线。
 */
const experienceStore = validateExperienceStore(storedExperiences);
export const schoolEntries: readonly SchoolExperienceEntry[] = listExperiences(experienceStore, "school");

const firstMonthIndex = 2023 * 12 + 8;
const lastMonthIndex = 2026 * 12 + 8;

/** Validate entries and return a new array, preserving input order for equal dates. */
export function sortSchoolEntries(
  entries: readonly SchoolExperienceEntry[],
): SchoolExperienceEntry[] {
  return listExperiences({ ...experienceStore, entries: [...entries] }, "school");
}

/** Build the complete month range from dated entries, without changing the input. */
export function buildSchoolMonths(entries: readonly SchoolExperienceEntry[]): SchoolMonth[] {
  const entriesByMonth = new Map<string, SchoolExperienceEntry[]>();
  let rangeStart = firstMonthIndex;
  let rangeEnd = lastMonthIndex;

  for (const entry of sortSchoolEntries(entries)) {
    const id = entry.date.slice(0, 7);
    const monthIndex = Number(entry.date.slice(0, 4)) * 12 + Number(entry.date.slice(5, 7)) - 1;
    rangeStart = Math.min(rangeStart, monthIndex);
    rangeEnd = Math.max(rangeEnd, monthIndex);
    const monthEntries = entriesByMonth.get(id) ?? [];
    monthEntries.push(entry);
    entriesByMonth.set(id, monthEntries);
  }

  return Array.from({ length: rangeEnd - rangeStart + 1 }, (_, index) => {
    const monthIndex = rangeStart + index;
    const year = Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
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

export const schoolMonths: SchoolMonth[] = buildSchoolMonths(schoolEntries);

export const schoolYears: SchoolYear[] = schoolMonths.reduce<SchoolYear[]>(
  (years, month, index) => {
    const currentYear = years[years.length - 1];

    if (currentYear?.year === month.year) {
      currentYear.count += 1;
    } else {
      years.push({ year: month.year, startIndex: index, count: 1 });
    }

    return years;
  },
  [],
);
