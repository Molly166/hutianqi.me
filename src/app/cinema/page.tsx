import type { Metadata } from "next";
import CinemaExperience from "@/components/cinema/CinemaExperience";
import FootstepBackLink from "@/components/journey/FootstepBackLink";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "Hu Tianqi's film and television journal.",
};

export default function CinemaPage() {
  return (
    <main className="school-detail">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        Watch Journal
      </h1>
      <FootstepBackLink transitionLabel="Leaving the cinema and returning to the life map" />
      <CinemaExperience />
    </main>
  );
}
