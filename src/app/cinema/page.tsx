import type { Metadata } from "next";
import CinemaExperience from "@/components/cinema/CinemaExperience";
import FootstepBackLink from "@/components/journey/FootstepBackLink";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "胡天齐的观影记录。",
};

export default function CinemaPage() {
  return (
    <main className="school-detail">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        观影记录
      </h1>
      <FootstepBackLink transitionLabel="正在离开影院，返回人生地图" />
      <CinemaExperience />
    </main>
  );
}
