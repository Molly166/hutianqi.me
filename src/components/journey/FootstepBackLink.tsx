import JourneyLink from "./JourneyLink";

export default function FootstepBackLink({
  transitionLabel,
}: {
  transitionLabel: string;
}) {
  return (
    <JourneyLink
      className="school-detail__back"
      href="/"
      aria-label="沿脚步返回人生地图"
      transitionLabel={transitionLabel}
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
  );
}
