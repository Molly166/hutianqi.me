import ExperienceCollection from "@/components/experiences/ExperienceCollection";
import { buildExperienceMonths } from "@/data/experienceTimeline";
import { loadExperienceStore } from "@/lib/experienceFiles";
import { listExperiences } from "@/lib/experiences";

export default function CinemaExperience() {
  const watchEntries = listExperiences(loadExperienceStore(), "watch");
  const currentYear = new Date().getUTCFullYear();
  const watchMonths = buildExperienceMonths(watchEntries, "watch", {
    start: { year: currentYear, month: 1 },
    end: { year: currentYear, month: 12 },
  });
  return <ExperienceCollection periods={watchMonths} label="观影记录" />;
}
