import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSchoolMonths,
  formatSchoolEntryDate,
  schoolEntries,
  schoolMonths,
  schoolYears,
  sortSchoolEntries,
} from "../src/data/schoolTimeline.ts";

const entry = (id, date) => ({ id, moduleId: "school", date, title: id });

test("an empty source retains every month from September 2023 to September 2026", () => {
  const months = buildSchoolMonths([]);
  assert.equal(months.length, 37);
  assert.deepEqual(months[0], {
    id: "2023-09", year: 2023, month: 9, label: "2023年9月", entries: [],
  });
  assert.deepEqual(months.at(-1), {
    id: "2026-09", year: 2026, month: 9, label: "2026年9月", entries: [],
  });
  assert.ok(months.every((month) => month.entries.length === 0));
  assert.equal(new Set(months.map((month) => month.id)).size, 37);
  months.forEach((month, index) => {
    assert.equal(month.year * 12 + month.month - 1, 2023 * 12 + 8 + index);
  });
});

test("shared source exports group real school entries into complete year ranges", () => {
  assert.ok(schoolEntries.every(({ moduleId }) => moduleId === "school"));
  assert.deepEqual(schoolMonths, buildSchoolMonths(schoolEntries));
  assert.equal(schoolYears[0].startIndex, 0);
  assert.equal(schoolYears.reduce((count, year) => count + year.count, 0), schoolMonths.length);
  schoolYears.forEach(({ year, startIndex, count }, index) => {
    assert.ok(count >= 1 && count <= 12);
    assert.ok(schoolMonths.slice(startIndex, startIndex + count).every((month) => month.year === year));
    if (index > 0) {
      const previous = schoolYears[index - 1];
      assert.equal(year, previous.year + 1);
      assert.equal(startIndex, previous.startIndex + previous.count);
    }
  });
});

test("entries are automatically grouped and sorted across and within months", () => {
  const months = buildSchoolMonths([
    entry("last", "2026-09-30"),
    entry("later-in-month", "2024-04-28"),
    entry("first", "2023-09-01"),
    entry("earlier-in-month", "2024-04-02"),
  ]);

  assert.deepEqual(months.flatMap((month) => month.entries.map(({ id }) => id)), [
    "first", "earlier-in-month", "later-in-month", "last",
  ]);
  assert.deepEqual(
    months.find(({ id }) => id === "2024-04").entries.map(({ id }) => id),
    ["earlier-in-month", "later-in-month"],
  );
  assert.equal(months.filter(({ entries }) => entries.length === 0).length, 34);
});

test("same-day entries retain their input order", () => {
  const entries = [
    entry("z-first", "2024-05-01"),
    entry("older", "2023-10-02"),
    entry("a-second", "2024-05-01"),
    entry("m-third", "2024-05-01"),
  ];

  assert.deepEqual(sortSchoolEntries(entries).map(({ id }) => id), [
    "older", "z-first", "a-second", "m-third",
  ]);
});

test("building and sorting do not mutate the source array or its entries", () => {
  const later = Object.freeze({
    ...entry("later", "2025-01-03"),
    text: "A real entry description",
    images: Object.freeze([Object.freeze({ src: "/images/school/memory.jpg", alt: "Campus" })]),
  });
  const earlier = Object.freeze(entry("earlier", "2023-12-01"));
  const entries = Object.freeze([later, earlier]);
  const sorted = sortSchoolEntries(entries);
  const months = buildSchoolMonths(entries);

  assert.notEqual(sorted, entries);
  assert.deepEqual(entries, [later, earlier]);
  assert.deepEqual(sorted, [earlier, later]);
  assert.deepEqual(months.find(({ id }) => id === "2025-01").entries[0], later);
  assert.deepEqual(months.find(({ id }) => id === "2023-12").entries[0], earlier);
});

test("valid leap days are accepted and displayed consistently", () => {
  const months = buildSchoolMonths([entry("leap-day", "2024-02-29")]);
  assert.equal(months.find(({ id }) => id === "2024-02").entries[0].date, "2024-02-29");
  assert.equal(formatSchoolEntryDate("2024-02-29"), "2024.02.29");
  assert.equal(formatSchoolEntryDate("2000-02-29"), "2000.02.29");
});

test("malformed and impossible dates are rejected instead of normalized", () => {
  const invalidDates = [
    undefined, null, "", "2024-2-01", "2024-02-1", "24-02-01", "2024/02/01",
    " 2024-02-01", "2024-02-01 ", "2024-02-01T00:00:00Z", "0000-01-01",
    "2024-00-01", "2024-13-01", "2024-01-00", "2024-01-32", "2024-04-31",
    "2024-02-30", "2023-02-29", "2025-02-29", "1900-02-29", "2100-02-29",
  ];

  for (const date of invalidDates) {
    assert.throws(() => buildSchoolMonths([entry("invalid", date)]), /Invalid experience date/);
    assert.throws(() => formatSchoolEntryDate(date), /Invalid experience date/);
  }
});

test("entry IDs must be nonempty and unique even across different months", () => {
  for (const id of [undefined, null, "", " ", "\t\n"]) {
    assert.throws(() => buildSchoolMonths([entry(id, "2024-03-01")]), /id must be a nonempty string/);
  }
  assert.throws(() => buildSchoolMonths([
    entry("repeated", "2023-09-01"),
    entry("repeated", "2026-09-30"),
  ]), /Duplicate experience entry id "repeated"/);
});

test("new entries automatically extend the timeline before and after its default range", () => {
  const months = buildSchoolMonths([
    entry("future", "2027-02-01"),
    entry("earlier", "2023-08-31"),
  ]);
  assert.equal(months.length, 43);
  assert.equal(months[0].id, "2023-08");
  assert.equal(months.at(-1).id, "2027-02");
  assert.deepEqual(months.flatMap(({ entries }) => entries.map(({ id }) => id)), ["earlier", "future"]);
  assert.ok(months.some(({ id }) => id === "2023-09"));
  assert.ok(months.some(({ id }) => id === "2026-09"));
});

test("school timelines include only school entries from the shared store", () => {
  const months = buildSchoolMonths([
    entry("school-note", "2024-09-01"),
    { ...entry("life-note", "2030-01-01"), moduleId: "life" },
  ]);
  assert.equal(months.length, 37);
  assert.deepEqual(months.flatMap(({ entries }) => entries.map(({ id }) => id)), ["school-note"]);
});

test("early four-digit years preserve month IDs when extending the timeline", () => {
  const months = buildSchoolMonths([entry("early", "0999-12-31")]);
  assert.equal(months[0].id, "0999-12");
  assert.equal(months[0].entries[0].id, "early");
});

test("separate builds and empty months do not share their mutable arrays", () => {
  const first = buildSchoolMonths([]);
  const second = buildSchoolMonths([]);
  assert.notEqual(first, second);
  assert.notEqual(first[0], second[0]);
  assert.notEqual(first[0].entries, second[0].entries);
  assert.notEqual(first[0].entries, first[1].entries);
});
