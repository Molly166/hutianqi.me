import type { Metadata } from "next";
import FootstepBackLink from "@/components/journey/FootstepBackLink";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "Hu Tianqi's experience at GeeTest.",
};

export default function GeetestPage() {
  return (
    <main className="school-detail">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        GeeTest
      </h1>
      <FootstepBackLink transitionLabel="Leaving GeeTest and returning to the life map" />
    </main>
  );
}
