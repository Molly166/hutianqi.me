"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatExperienceDate, type ExperienceEntry } from "@/lib/experiences";
import ExperienceTimeline from "./ExperienceTimeline";

export interface ExperiencePeriod {
  id: string;
  year: number;
  month: number;
  label: string;
  entries: readonly ExperienceEntry[];
}

interface Props {
  periods: readonly ExperiencePeriod[];
  label: string;
}

function Note({ entry }: { entry: ExperienceEntry }) {
  return (
    <article className="experience-note" data-entry-id={entry.id}>
      <Image className="experience-note__pin" src="/images/experiences/note-pin.webp" alt="" width={34} height={34} />
      <time className="experience-note__date" dateTime={entry.date}>{formatExperienceDate(entry.date)}</time>
      {entry.title && <h2 className="experience-note__title">{entry.title}</h2>}
      {entry.text && <p className="experience-note__text">{entry.text}</p>}
      {!!entry.images?.length && (
        <div className="experience-note__images">
          {entry.images.map((photo, index) => (
            <Image key={`${photo.src}-${index}`} className="experience-note__photo" src={photo.src} alt={photo.alt} width={800} height={600} draggable={false} />
          ))}
        </div>
      )}
    </article>
  );
}

/** Reusable read-only presentation. Content editing lives in the experience store/CLI. */
export default function ExperienceCollection({ periods, label }: Props) {
  const [selection, setSelection] = useState<{ id: string; previousId: string | null; revision: number }>({ id: periods[0]?.id ?? "", previousId: null, revision: 0 });
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const selectedIndex = Math.max(0, periods.findIndex((period) => period.id === selection.id));
  const current = periods[selectedIndex];
  const previous = periods.find((period) => period.id === selection.previousId && period.id !== current?.id);

  useEffect(() => {
    if (!selection.previousId) return;
    const timer = window.setTimeout(() => {
      setSelection((state) => state.revision === selection.revision ? { ...state, previousId: null } : state);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [selection.previousId, selection.revision]);

  const select = (index: number) => {
    if (index < 0 || index >= periods.length || index === selectedIndex) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSelection((state) => ({
      id: periods[index].id,
      previousId: reduceMotion ? null : current.id,
      revision: state.revision + 1,
    }));
  };

  const finishSwipe = (event: PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      select(selectedIndex + (dx < 0 ? 1 : -1));
    }
  };

  if (!current) return null;

  return (
    <div className="experience-collection">
      <div
        className="experience-stage"
        role="region"
        aria-label={`${label}便签板`}
        onPointerDown={(event) => {
          if (!event.isPrimary || event.button !== 0) return;
          pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={finishSwipe}
        onPointerCancel={() => { pointerStart.current = null; }}
      >
        {(previous ? [previous, current] : [current]).map((period) => {
          const outgoing = period.id !== current.id;
          return (
            <div
              key={period.id}
              className="experience-board"
              data-motion={!previous ? undefined : outgoing ? "out" : "in"}
              aria-hidden={outgoing || undefined}
              inert={outgoing || undefined}
              aria-label={period.label}
            >
              <div className="experience-board__notes">
                {period.entries.map((entry) => <Note key={entry.id} entry={entry} />)}
              </div>
            </div>
          );
        })}
      </div>
      <span className="sr-only" role="status">{current.label}，{current.entries.length}条经历</span>
      <ExperienceTimeline months={periods} label={label} selectedIndex={selectedIndex} onSelect={select} />
    </div>
  );
}
