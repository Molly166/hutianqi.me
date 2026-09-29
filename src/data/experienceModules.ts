export const EXPERIENCE_MODULES = [
  { id: "school", label: "Education" },
  { id: "company", label: "Companies" },
  { id: "internship", label: "Internships" },
  { id: "work", label: "Work" },
  { id: "life", label: "Life" },
  { id: "watch", label: "Watch Journal" },
] as const;

export type ExperienceModuleId = (typeof EXPERIENCE_MODULES)[number]["id"];

export function isExperienceModuleId(value: string): value is ExperienceModuleId {
  return EXPERIENCE_MODULES.some(({ id }) => id === value);
}
