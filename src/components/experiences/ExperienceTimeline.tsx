"use client";

import { type CSSProperties, type KeyboardEvent, useEffect, useRef } from "react";
import type { ExperiencePeriod, ExperiencePeriodUnit } from "./ExperienceCollection";

interface Props {
  periods: readonly ExperiencePeriod[];
  unit: ExperiencePeriodUnit;
  selectedIndex: number;
  onSelect: (index: number) => void;
  label: string;
}

export default function ExperienceTimeline({ periods, unit, selectedIndex, onSelect: setSelectedIndex, label }: Props) {
  const years = periods.reduce<Array<{ year: number; startIndex: number; count: number }>>((years, period, index) => {
    const last = years.at(-1);
    if (last?.year === period.year) last.count += 1;
    else years.push({ year: period.year, startIndex: index, count: 1 });
    return years;
  }, []);
  const timelineViewport = useRef<HTMLDivElement>(null);
  const periodButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedPeriod = periods[selectedIndex];

  useEffect(() => {
    const viewport = timelineViewport.current;
    const button = periodButtons.current[selectedIndex];
    if (!viewport || !button) return;

    // A new choice must also cancel an unfinished scroll to the previous period.
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

  const handlePeriodKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (index + 1) % periods.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (index - 1 + periods.length) % periods.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = periods.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    setSelectedIndex(nextIndex);
    periodButtons.current[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <section className="experience-timeline" aria-label={`${label}时间轴`}>
      <div className="experience-timeline__viewport" ref={timelineViewport}>
        <div
          className="experience-timeline__ruler"
          style={{
            "--period-count": periods.length,
          } as CSSProperties}
        >
          <div className="experience-timeline__years">
            {years.map((year) => (
              <button
                key={year.year}
                type="button"
                className="experience-timeline__year"
                data-active={year.year === selectedPeriod.year}
                style={{ gridColumn: `${year.startIndex + 1} / span ${year.count}` }}
                aria-label={`跳到${periods[year.startIndex].label}`}
                onClick={() => setSelectedIndex(year.startIndex)}
              >
                {year.year}
              </button>
            ))}
          </div>

          <div className="experience-timeline__months" role="radiogroup" aria-label={`选择${label}${unit === "day" ? "日期" : "月份"}`}>
            {periods.map((period, index) => (
              <button
                key={period.id}
                ref={(node) => { periodButtons.current[index] = node; }}
                type="button"
                role="radio"
                aria-label={period.label}
                aria-checked={selectedIndex === index}
                tabIndex={selectedIndex === index ? 0 : -1}
                className="experience-timeline__month"
                data-major={index === 0 || (unit === "month" ? period.month === 1 : period.day === 1)}
                onClick={() => setSelectedIndex(index)}
                onKeyDown={(event) => handlePeriodKey(event, index)}
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
