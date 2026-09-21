"use client";

import {
  type PointerEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { getAdjacentExperienceImageSources } from "@/lib/experienceImagePreload";
import { formatExperienceDate, type ExperienceEntry } from "@/lib/experiences";
import ExperienceTimeline from "./ExperienceTimeline";

export interface ExperiencePeriod {
  id: string;
  year: number;
  month: number;
  day?: number;
  label: string;
  entries: readonly ExperienceEntry[];
}

export type ExperiencePeriodUnit = "month" | "day";

interface Props {
  periods: readonly ExperiencePeriod[];
  label: string;
  periodUnit?: ExperiencePeriodUnit;
}

function Note({ entry }: { entry: ExperienceEntry }) {
  return (
    <article className="experience-note" data-entry-id={entry.id}>
      <Image className="experience-note__pin" src="/images/experiences/note-pin.webp" alt="" width={34} height={34} />
      <time className="experience-note__date" dateTime={entry.date}>{formatExperienceDate(entry.date)}</time>
      {entry.title && <h2 className="experience-note__title">{entry.title}</h2>}
      {entry.text && <p className="experience-note__text">{entry.text}</p>}
      {entry.textEn && <p className="experience-note__text experience-note__text--en" lang="en">{entry.textEn}</p>}
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

interface NotePlacement {
  width: number;
  x: number;
  y: number;
}

interface NoteLayout {
  height: number;
  placements: NotePlacement[];
}

function sameLayout(current: NoteLayout | null, next: NoteLayout): boolean {
  if (!current || Math.abs(current.height - next.height) > 0.5 || current.placements.length !== next.placements.length) {
    return false;
  }
  return current.placements.every((placement, index) => {
    const candidate = next.placements[index];
    return Math.abs(placement.width - candidate.width) <= 0.5
      && Math.abs(placement.x - candidate.x) <= 0.5
      && Math.abs(placement.y - candidate.y) <= 0.5;
  });
}

function MasonryNotes({ entries }: { entries: readonly ExperienceEntry[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [layout, setLayout] = useState<NoteLayout | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let widthFrame = 0;
    let heightFrame = 0;
    let observedWidth = container.clientWidth;

    const scheduleLayout = () => {
      window.cancelAnimationFrame(widthFrame);
      window.cancelAnimationFrame(heightFrame);
      widthFrame = window.requestAnimationFrame(() => {
        const styles = window.getComputedStyle(container);
        const columnCount = Math.max(
          1,
          Math.round(Number.parseFloat(styles.getPropertyValue("--experience-column-count")) || 1),
        );
        const columnGap = Number.parseFloat(styles.getPropertyValue("--experience-column-gap")) || 0;
        const rowGap = Number.parseFloat(styles.getPropertyValue("--experience-row-gap")) || 0;
        const availableWidth = container.clientWidth;
        const itemWidth = Math.max(
          0,
          (availableWidth - columnGap * (columnCount - 1)) / columnCount,
        );
        const items = itemRefs.current.slice(0, entries.length);

        for (const item of items) {
          if (item) item.style.width = `${itemWidth}px`;
        }

        heightFrame = window.requestAnimationFrame(() => {
          if (cancelled) return;
          const columnBottoms = Array.from({ length: columnCount }, () => 0);
          const placements = items.map((item): NotePlacement => {
            let column = 0;
            for (let index = 1; index < columnBottoms.length; index += 1) {
              if (columnBottoms[index] < columnBottoms[column] - 0.5) column = index;
            }
            const y = columnBottoms[column];
            columnBottoms[column] = y + (item?.offsetHeight ?? 0) + rowGap;
            return {
              width: itemWidth,
              x: column * (itemWidth + columnGap),
              y,
            };
          });
          const occupiedHeight = placements.length ? Math.max(...columnBottoms) - rowGap : 0;
          const nextLayout = { height: Math.max(0, occupiedHeight), placements };
          setLayout((current) => sameLayout(current, nextLayout) ? current : nextLayout);
        });
      });
    };

    const containerObserver = new ResizeObserver(([entry]) => {
      const nextWidth = entry.contentRect.width;
      if (Math.abs(nextWidth - observedWidth) <= 0.5) return;
      observedWidth = nextWidth;
      scheduleLayout();
    });
    const itemObserver = new ResizeObserver(scheduleLayout);
    containerObserver.observe(container);
    for (const item of itemRefs.current.slice(0, entries.length)) {
      if (item) itemObserver.observe(item);
    }

    scheduleLayout();
    document.fonts.ready.then(() => {
      if (!cancelled) scheduleLayout();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(widthFrame);
      window.cancelAnimationFrame(heightFrame);
      containerObserver.disconnect();
      itemObserver.disconnect();
    };
  }, [entries]);

  return (
    <div
      ref={containerRef}
      className="experience-board__notes"
      data-masonry={layout ? "true" : undefined}
      style={layout ? { height: layout.height } : undefined}
    >
      {entries.map((entry, index) => {
        const placement = layout?.placements[index];
        return (
          <div
            key={entry.id}
            ref={(node) => { itemRefs.current[index] = node; }}
            className="experience-note-slot"
            style={placement ? {
              width: placement.width,
              transform: `translate3d(${placement.x}px, ${placement.y}px, 0)`,
            } : undefined}
          >
            <Note entry={entry} />
          </div>
        );
      })}
    </div>
  );
}

/** Reusable read-only presentation. Content editing lives in the experience store/CLI. */
export default function ExperienceCollection({ periods, label, periodUnit = "month" }: Props) {
  const [selection, setSelection] = useState<{
    id: string;
    previousId: string | null;
    direction: "forward" | "backward" | null;
    revision: number;
  }>({ id: periods[0]?.id ?? "", previousId: null, direction: null, revision: 0 });
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const requestedImagePreloads = useRef(new Set<string>());
  const pendingImagePreloads = useRef(new Map<string, HTMLImageElement>());
  const selectedIndex = Math.max(0, periods.findIndex((period) => period.id === selection.id));
  const current = periods[selectedIndex];
  const previous = periods.find((period) => period.id === selection.previousId && period.id !== current?.id);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    const sources = getAdjacentExperienceImageSources(periods, selectedIndex);
    if (!sources.length) return;

    const startPreloading = () => {
      for (const src of sources) {
        if (requestedImagePreloads.current.has(src)) continue;

        requestedImagePreloads.current.add(src);
        const image = new window.Image();
        image.decoding = "async";
        image.fetchPriority = "low";
        pendingImagePreloads.current.set(src, image);

        image.onload = () => {
          pendingImagePreloads.current.delete(src);
        };
        image.onerror = () => {
          pendingImagePreloads.current.delete(src);
          requestedImagePreloads.current.delete(src);
        };
        image.src = src;
      }
    };

    let idleCallbackId: number | undefined;
    let fallbackTimerId: number | undefined;

    if (typeof window.requestIdleCallback === "function") {
      idleCallbackId = window.requestIdleCallback(startPreloading, { timeout: 800 });
    } else {
      fallbackTimerId = window.setTimeout(startPreloading, 250);
    }

    return () => {
      if (idleCallbackId !== undefined) window.cancelIdleCallback(idleCallbackId);
      if (fallbackTimerId !== undefined) window.clearTimeout(fallbackTimerId);
    };
  }, [periods, selectedIndex]);

  useEffect(() => {
    if (!selection.previousId) return;
    const timer = window.setTimeout(() => {
      setSelection((state) => state.revision === selection.revision
        ? { ...state, previousId: null, direction: null }
        : state);
    }, 720);
    return () => window.clearTimeout(timer);
  }, [selection.previousId, selection.revision]);

  const select = (index: number) => {
    if (index < 0 || index >= periods.length) return;
    const targetId = periods[index].id;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSelection((state) => {
      if (state.id === targetId) return state;
      const fromIndex = periods.findIndex((period) => period.id === state.id);
      return {
        id: targetId,
        previousId: reduceMotion ? null : state.id,
        direction: reduceMotion ? null : index > fromIndex ? "forward" : "backward",
        revision: state.revision + 1,
      };
    });
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
              data-direction={previous ? selection.direction ?? undefined : undefined}
              aria-hidden={outgoing || undefined}
              inert={outgoing || undefined}
              aria-label={period.label}
            >
              <MasonryNotes entries={period.entries} />
            </div>
          );
        })}
      </div>
      <span className="sr-only" role="status">{current.label}，{current.entries.length}张便签</span>
      <ExperienceTimeline periods={periods} unit={periodUnit} label={label} selectedIndex={selectedIndex} onSelect={select} />
    </div>
  );
}
