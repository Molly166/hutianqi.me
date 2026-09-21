import type { ExperienceEntry } from "./experiences.ts";

interface ExperienceImagePeriod {
  entries: readonly Pick<ExperienceEntry, "images">[];
}

/** Collect unique images from the periods immediately before and after the current one. */
export function getAdjacentExperienceImageSources(
  periods: readonly ExperienceImagePeriod[],
  selectedIndex: number,
): string[] {
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= periods.length) {
    return [];
  }

  const sources: string[] = [];
  const seen = new Set<string>();

  for (const index of [selectedIndex - 1, selectedIndex + 1]) {
    const period = periods[index];
    if (!period) continue;

    for (const entry of period.entries) {
      for (const image of entry.images ?? []) {
        if (seen.has(image.src)) continue;
        seen.add(image.src);
        sources.push(image.src);
      }
    }
  }

  return sources;
}
