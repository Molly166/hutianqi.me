import type { Metadata } from "next";
import JourneyLink from "@/components/journey/JourneyLink";
import SchoolExperience from "@/components/school/SchoolExperience";

export const metadata: Metadata = {
  title: "hutianqi.me",
  description: "胡天齐在中南民族大学的经历。",
};

export default function SchoolPage() {
  return (
    <main className="school-detail">
      <h1 className="sr-only" data-journey-heading tabIndex={-1}>
        中南民族大学
      </h1>
      <JourneyLink
        className="school-detail__back"
        href="/"
        aria-label="沿脚步返回人生地图"
        transitionLabel="正在离开学校，返回人生地图"
      >
        <svg
          className="school-detail__footsteps"
          viewBox="0 0 64 64"
          aria-hidden="true"
        >
          <defs>
            <g id="footprint-shape">
              <path d="M8.2 11.1c-3.4 1.5-4.1 6.4-2.6 10.3 1.2 3 3 4.3 4.2 7.6 1.1 3 4.2 4 6.7 1.9 2.5-2.1 2.2-5.5 2.3-8.5.1-4.2-1.5-10.4-6.1-11.6-1.5-.4-3.1-.3-4.5.3Z" />
              <circle cx="7.1" cy="6.6" r="3" />
              <circle cx="12.6" cy="5.2" r="2.45" />
              <circle cx="17.2" cy="5.3" r="1.95" />
              <circle cx="20.7" cy="6.7" r="1.55" />
              <circle cx="23" cy="9" r="1.2" />
            </g>
          </defs>

          <g className="footprint footprint--far">
            <g transform="translate(7 4) rotate(-30 12 18) scale(.72)">
              <use href="#footprint-shape" />
            </g>
          </g>
          <g className="footprint footprint--near">
            <g transform="translate(29 27) rotate(-30 12 18)">
              <use href="#footprint-shape" transform="translate(24 0) scale(-1 1)" />
            </g>
          </g>
        </svg>
      </JourneyLink>
      <SchoolExperience />
    </main>
  );
}
