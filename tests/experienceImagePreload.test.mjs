import assert from "node:assert/strict";
import test from "node:test";
import { getAdjacentExperienceImageSources } from "../src/lib/experienceImagePreload.ts";

const image = (src) => ({ src, alt: src });
const period = (...imageGroups) => ({
  entries: imageGroups.map((images) => ({ images })),
});

test("collects images from the previous and next periods in stable order", () => {
  const periods = [
    period([image("/previous-a.webp"), image("/shared.webp")]),
    period([image("/current.webp")]),
    period([image("/next-a.webp"), image("/shared.webp")], [image("/next-b.webp")]),
  ];

  assert.deepEqual(getAdjacentExperienceImageSources(periods, 1), [
    "/previous-a.webp",
    "/shared.webp",
    "/next-a.webp",
    "/next-b.webp",
  ]);
});

test("only collects the available adjacent side at timeline boundaries", () => {
  const periods = [
    period([image("/first.webp")]),
    period([image("/second.webp")]),
    period([image("/third.webp")]),
  ];

  assert.deepEqual(getAdjacentExperienceImageSources(periods, 0), ["/second.webp"]);
  assert.deepEqual(getAdjacentExperienceImageSources(periods, 2), ["/second.webp"]);
});

test("ignores empty periods and invalid selections", () => {
  const periods = [period([]), { entries: [{}] }, period([])];

  assert.deepEqual(getAdjacentExperienceImageSources(periods, 1), []);
  assert.deepEqual(getAdjacentExperienceImageSources(periods, -1), []);
  assert.deepEqual(getAdjacentExperienceImageSources(periods, 3), []);
});
