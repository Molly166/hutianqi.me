"use client";

import { type CSSProperties, type KeyboardEvent, useEffect, useRef } from "react";
import type { ExperiencePeriod } from "./ExperienceCollection";

interface Props {
  months: readonly ExperiencePeriod[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label: string;
}

export default function ExperienceTimeline({ months, selectedIndex, onSelect: setSelectedIndex, label }: Props) {
  const years = months.reduce<Array<{ year: number; startIndex: number; count: number }>>((years, month, index) => {
    const last = years.at(-1);
    if (last?.year === month.year) last.count += 1;
    else years.push({ year: month.year, startIndex: index, count: 1 });
    return years;
  }, []);
  const timelineViewport = useRef<HTMLDivElement>(null);
  const monthButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedMonth = months[selectedIndex];

  useEffect(() => {
    const viewport = timelineViewport.current;
    const button = monthButtons.current[selectedIndex];
    if (!viewport || !button) return;

    // A new choice must also cancel an unfinished scroll to the previous month.
    viewport.scrollTo({ left: viewport.scrollLeft, behavior: "instant" });
    const revealSelection = (animate: boolean) => {
      const viewportRect = viewport.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      if (
        buttonRect.left < viewportRect.left + 16 ||
        buttonRect.right > viewportRect.right - 16
      ) {
        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        viewport.scrollTo({
          left:
            viewport.scrollLeft +
            buttonRect.left -
            viewportRect.left -
            (viewportRect.width - buttonRect.width) / 2,
          behavior: animate && !reduceMotion ? "smooth" : "instant",
        });
      }
    };

    revealSelection(true);
    let viewportWidth = viewport.clientWidth;
    const observer = new ResizeObserver(() => {
      if (viewport.clientWidth === viewportWidth) return;
      viewportWidth = viewport.clientWidth;
      revealSelection(false);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [selectedIndex]);

  const handleMonthKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (index + 1) % months.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (index - 1 + months.length) % months.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = months.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setSelectedIndex(nextIndex);
    monthButtons.current[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <section className="experience-timeline" aria-label={`${label}时间轴`}>
      <div className="experience-timeline__viewport" ref={timelineViewport}>
        <div
          className="experience-timeline__ruler"
          style={{
            "--month-count": months.length,
          } as CSSProperties}
        >
          <div className="experience-timeline__years">
            {years.map((year) => (
              <button
                key={year.year}
                type="button"
                className="experience-timeline__year"
                data-active={year.year === selectedMonth.year}
                style={{ gridColumn: `${year.startIndex + 1} / span ${year.count}` }}
                aria-label={`跳到${months[year.startIndex].label}`}
                onClick={() => setSelectedIndex(year.startIndex)}
              >
                {year.year}
              </button>
            ))}
          </div>

          <div className="experience-timeline__months" role="radiogroup" aria-label={`选择${label}月份`}>
            {months.map((month, index) => (
              <button
                key={month.id}
                ref={(node) => { monthButtons.current[index] = node; }}
                type="button"
                role="radio"
                aria-label={month.label}
                aria-checked={selectedIndex === index}
                tabIndex={selectedIndex === index ? 0 : -1}
                className="experience-timeline__month"
                data-major={month.month === 1 || index === 0}
                onClick={() => setSelectedIndex(index)}
                onKeyDown={(event) => handleMonthKey(event, index)}
              >
                <span className="experience-timeline__tick" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
