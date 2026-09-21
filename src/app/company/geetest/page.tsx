import type { Metadata } from "next";
import FootstepBackLink from "@/components/journey/FootstepBackLink";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "胡天齐在极验的经历。",
};

export default function GeetestPage() {
  return (
    <main className="school-detail">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        极验
      </h1>
      <FootstepBackLink transitionLabel="正在离开极验，返回人生地图" />
    </main>
  );
}
