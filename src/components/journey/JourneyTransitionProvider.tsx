"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type TransitionPhase = "idle" | "departing" | "covered" | "arriving";

type TransitionRequest = {
  href: string;
  label: string;
};

type JourneyTransitionContextValue = {
  beginJourney: (request: TransitionRequest) => void;
  isTransitioning: boolean;
};

const JourneyTransitionContext = createContext<JourneyTransitionContextValue | null>(
  null,
);

const normalizePath = (path: string) => {
  const pathOnly = path.split(/[?#]/, 1)[0] || "/";
  if (pathOnly === "/") return pathOnly;
  return pathOnly.replace(/\/$/, "");
};

const TRANSITION_DURATION = {
  cover: 1150,
  reveal: 760,
  reducedCover: 120,
  reducedReveal: 140,
  navigationFallback: 5000,
} as const;

function JourneyTransitionOverlay({
  phase,
  request,
}: {
  phase: TransitionPhase;
  request: TransitionRequest | null;
}) {
  if (!request || phase === "idle") return null;

  const sides = ["top", "right", "bottom", "left"] as const;
  const landingCharacters = Array.from("landing...");

  return (
    <div
      className={`journey-transition journey-transition--${phase}`}
      role="status"
      aria-live="polite"
      aria-label={request.label}
      tabIndex={-1}
      autoFocus
    >
      <div className="journey-transition__cloud-stage" aria-hidden="true">
        {sides.map((side) => (
          <div
            className={`journey-transition__cloud-bank journey-transition__cloud-bank--${side}`}
            key={side}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <i key={index} />
            ))}
          </div>
        ))}

        <div className="journey-transition__landing">
          {landingCharacters.map((character, index) => (
            <span
              key={`${character}-${index}`}
              style={{ animationDelay: `${index * 70}ms` }}
            >
              {character}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function JourneyTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<TransitionPhase>("idle");
  const [request, setRequest] = useState<TransitionRequest | null>(null);
  const phaseRef = useRef<TransitionPhase>("idle");
  const coverTimer = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);
  const navigationFallbackTimer = useRef<number | null>(null);

  const setTransitionPhase = useCallback((nextPhase: TransitionPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const beginJourney = useCallback(
    (nextRequest: TransitionRequest) => {
      if (phaseRef.current !== "idle") return;

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      setRequest(nextRequest);
      setTransitionPhase("departing");
      router.prefetch(nextRequest.href);

      coverTimer.current = window.setTimeout(
        () => {
          setTransitionPhase("covered");
          router.push(nextRequest.href);
          navigationFallbackTimer.current = window.setTimeout(() => {
            if (phaseRef.current === "covered") {
              window.location.assign(nextRequest.href);
            }
          }, TRANSITION_DURATION.navigationFallback);
        },
        reduceMotion
          ? TRANSITION_DURATION.reducedCover
          : TRANSITION_DURATION.cover,
      );
    },
    [router, setTransitionPhase],
  );

  useEffect(() => {
    if (!request || phase !== "covered") return;
    if (normalizePath(pathname) !== normalizePath(request.href)) return;

    if (navigationFallbackTimer.current) {
      window.clearTimeout(navigationFallbackTimer.current);
      navigationFallbackTimer.current = null;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const revealTimer = window.setTimeout(() => {
      setTransitionPhase("arriving");
      finishTimer.current = window.setTimeout(
        () => {
          setTransitionPhase("idle");
          setRequest(null);
          window.requestAnimationFrame(() => {
            document
              .querySelector<HTMLElement>("[data-journey-heading]")
              ?.focus({ preventScroll: true });
          });
        },
        reduceMotion
          ? TRANSITION_DURATION.reducedReveal
          : TRANSITION_DURATION.reveal,
      );
    }, 50);

    return () => window.clearTimeout(revealTimer);
  }, [pathname, phase, request, setTransitionPhase]);

  useEffect(
    () => () => {
      if (coverTimer.current) window.clearTimeout(coverTimer.current);
      if (finishTimer.current) window.clearTimeout(finishTimer.current);
      if (navigationFallbackTimer.current) {
        window.clearTimeout(navigationFallbackTimer.current);
      }
    },
    [],
  );

  return (
    <JourneyTransitionContext.Provider
      value={{ beginJourney, isTransitioning: phase !== "idle" }}
    >
      <div inert={phase !== "idle"}>{children}</div>
      <JourneyTransitionOverlay phase={phase} request={request} />
    </JourneyTransitionContext.Provider>
  );
}

export function useJourneyTransition() {
  const context = useContext(JourneyTransitionContext);
  if (!context) {
    throw new Error(
      "useJourneyTransition must be used inside JourneyTransitionProvider",
    );
  }
  return context;
}
