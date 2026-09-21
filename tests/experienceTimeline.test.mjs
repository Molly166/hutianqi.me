import assert from "node:assert/strict";
import test from "node:test";
import {
  buildExperienceDays,
  buildExperienceMonths,
  sortExperienceEntries,
} from "../src/data/experienceTimeline.ts";

const entry = (id, moduleId, date) => ({ id, moduleId, date, text: id });

test("a module timeline filters content, sorts stably, and keeps its default range", () => {
  const entries = [
    entry("watch-second", "watch", "2026-03-02"),
    entry("life-note", "life", "2026-02-01"),
    entry("watch-first", "watch", "2026-03-01"),
    entry("watch-third", "watch", "2026-03-02"),
  ];
  const months = buildExperienceMonths(entries, "watch", {
    start: { year: 2026, month: 1 },
    end: { year: 2026, month: 12 },
  });

  assert.equal(months.length, 12);
  assert.equal(months[0].id, "2026-01");
  assert.equal(months.at(-1).id, "2026-12");
  assert.deepEqual(months[2].entries.map(({ id }) => id), [
    "watch-first",
    "watch-second",
    "watch-third",
  ]);
  assert.deepEqual(sortExperienceEntries(entries, "watch").map(({ id }) => id), [
    "watch-first",
    "watch-second",
    "watch-third",
  ]);
});

test("real entries extend a module timeline beyond its default range", () => {
  const months = buildExperienceMonths(
    [entry("old-film", "watch", "2024-11-20"), entry("future-series", "watch", "2027-02-01")],
    "watch",
    {
      start: { year: 2026, month: 1 },
      end: { year: 2026, month: 12 },
    },
  );
  assert.equal(months[0].id, "2024-11");
  assert.equal(months.at(-1).id, "2027-02");
});

test("invalid default month ranges fail clearly", () => {
  assert.throws(
    () => buildExperienceMonths([], "watch", {
      start: { year: 2026, month: 13 },
      end: { year: 2026, month: 12 },
    }),
    /Invalid experience month/,
  );
  assert.throws(
    () => buildExperienceMonths([], "watch", {
      start: { year: 2026, month: 12 },
      end: { year: 2026, month: 1 },
    }),
    /start must not be after/,
  );
});

test("daily periods filter by module, preserve same-day order, and split distinct dates", () => {
  const entries = [
    entry("watch-next", "watch", "2025-04-21"),
    entry("life-note", "life", "2025-04-20"),
    entry("watch-first", "watch", "2025-04-20"),
    entry("watch-second", "watch", "2025-04-20"),
  ];
  const snapshot = structuredClone(entries);

  const days = buildExperienceDays(entries, "watch");

  assert.deepEqual(days.map(({ id }) => id), ["2025-04-20", "2025-04-21"]);
  assert.deepEqual(days[0].entries.map(({ id }) => id), ["watch-first", "watch-second"]);
  assert.deepEqual(days[1].entries.map(({ id }) => id), ["watch-next"]);
  assert.deepEqual(entries, snapshot);
});

test("daily periods expose calendar fields and labels across month and year boundaries", () => {
  const days = buildExperienceDays([
    entry("new-year", "watch", "2026-01-01"),
    entry("year-end", "watch", "2025-12-31"),
    entry("next-month", "watch", "2026-02-01"),
  ], "watch");

  assert.deepEqual(days.map(({ id, year, month, day, label }) => ({
    id,
    year,
    month,
    day,
    label,
  })), [
    {
      id: "2025-12-31",
      year: 2025,
      month: 12,
      day: 31,
      label: "2025年12月31日",
    },
    {
      id: "2026-01-01",
      year: 2026,
      month: 1,
      day: 1,
      label: "2026年1月1日",
    },
    {
      id: "2026-02-01",
      year: 2026,
      month: 2,
      day: 1,
      label: "2026年2月1日",
    },
  ]);
});

test("daily periods are empty when their source is empty", () => {
  assert.deepEqual(buildExperienceDays([], "watch"), []);
});
