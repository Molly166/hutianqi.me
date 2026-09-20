"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useJourneyTransition } from "./JourneyTransitionProvider";

type JourneyLinkProps = {
  href: string;
  transitionLabel: string;
  "aria-label": string;
  className?: string;
  children: ReactNode;
};

export default function JourneyLink({
  href,
  transitionLabel,
  children,
  ...linkProps
}: JourneyLinkProps) {
  const { beginJourney } = useJourneyTransition();

  return (
    <Link
      {...linkProps}
      href={href}
      onNavigate={(event) => {
        event.preventDefault();
        beginJourney({ href, label: transitionLabel });
      }}
    >
      {children}
    </Link>
  );
}
