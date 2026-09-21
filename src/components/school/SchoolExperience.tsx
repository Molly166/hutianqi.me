import ExperienceCollection from "@/components/experiences/ExperienceCollection";
import { buildSchoolMonths } from "@/data/schoolTimeline";
import { loadExperienceStore } from "@/lib/experienceFiles";
import { listExperiences } from "@/lib/experiences";

export default function SchoolExperience() {
  const schoolEntries = listExperiences(loadExperienceStore(), "school");
  const schoolMonths = buildSchoolMonths(schoolEntries);
  return <ExperienceCollection periods={schoolMonths} label="学校经历" />;
}
