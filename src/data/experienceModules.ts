export const EXPERIENCE_MODULES = [
  { id: "school", label: "学校" },
  { id: "company", label: "公司" },
  { id: "internship", label: "实习" },
  { id: "work", label: "工作" },
  { id: "life", label: "生活" },
  { id: "watch", label: "观影" },
] as const;

export type ExperienceModuleId = (typeof EXPERIENCE_MODULES)[number]["id"];

export function isExperienceModuleId(value: string): value is ExperienceModuleId {
  return EXPERIENCE_MODULES.some(({ id }) => id === value);
}
