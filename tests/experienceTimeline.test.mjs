import assert from "node:assert/strict";
import test from "node:test";
import {
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
