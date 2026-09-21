import ExperienceCollection from "@/components/experiences/ExperienceCollection";
import { buildExperienceDays } from "@/data/experienceTimeline";
import { loadExperienceStore } from "@/lib/experienceFiles";
import { listExperiences } from "@/lib/experiences";

export default function CinemaExperience() {
  const watchEntries = listExperiences(loadExperienceStore(), "watch");
  const watchDays = buildExperienceDays(watchEntries, "watch");
  return <ExperienceCollection periods={watchDays} periodUnit="day" label="观影记录" />;
}
