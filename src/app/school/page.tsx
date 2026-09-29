import type { Metadata } from "next";
import FootstepBackLink from "@/components/journey/FootstepBackLink";
import SchoolExperience from "@/components/school/SchoolExperience";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "Hu Tianqi's experiences at South-Central Minzu University.",
};

export default function SchoolPage() {
  return (
    <main className="school-detail">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        South-Central Minzu University
      </h1>
      <FootstepBackLink transitionLabel="Leaving the university and returning to the life map" />
      <SchoolExperience />
    </main>
  );
}
