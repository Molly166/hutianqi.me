import ExperienceCollection from "@/components/experiences/ExperienceCollection";
import { schoolMonths } from "@/data/schoolTimeline";

export default function SchoolExperience() {
  return <ExperienceCollection periods={schoolMonths} label="学校经历" />;
}
