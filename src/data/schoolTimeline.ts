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
 * The caller loads education entries; this module validates, filters, groups,
 * and sorts them. The default range expands when real entries fall outside it.
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
