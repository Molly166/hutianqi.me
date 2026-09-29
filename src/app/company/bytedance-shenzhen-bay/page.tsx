import type { Metadata } from "next";
import FootstepBackLink from "@/components/journey/FootstepBackLink";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "Hu Tianqi's experience at ByteDance's Shenzhen Bay office.",
};

export default function ByteDanceShenzhenBayPage() {
  return (
    <main className="school-detail">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        ByteDance Shenzhen Bay
      </h1>
      <FootstepBackLink transitionLabel="Leaving ByteDance Shenzhen Bay and returning to the life map" />
    </main>
  );
}
