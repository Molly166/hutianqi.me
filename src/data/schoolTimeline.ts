import {
  buildExperienceMonths,
  sortExperienceEntries,
  type ExperienceMonth,
} from "./experienceTimeline.ts";
import {
  type ExperienceEntry,
} from "../lib/experiences.ts";

export { formatExperienceDate as formatSchoolEntryDate } from "../lib/experiences.ts";
export type SchoolExperienceEntry = ExperienceEntry;

export type SchoolMonth = ExperienceMonth;

/**
 * 学校经历由调用方加载；这里只负责校验、筛选、归月和排序。
 * 默认显示 2023 年 9 月至 2026 年 9 月，超出范围的新经历会自动延伸时间线。
 */
/** Validate entries and return a new array, preserving input order for equal dates. */
export function sortSchoolEntries(
  entries: readonly SchoolExperienceEntry[],
): SchoolExperienceEntry[] {
  return sortExperienceEntries(entries, "school");
}

/** Build the complete month range from dated entries, without changing the input. */
export function buildSchoolMonths(entries: readonly SchoolExperienceEntry[]): SchoolMonth[] {
  return buildExperienceMonths(entries, "school", {
    start: { year: 2023, month: 9 },
    end: { year: 2026, month: 9 },
  });
}
