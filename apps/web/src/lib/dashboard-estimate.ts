// Pure helpers for the student dashboard/progress estimate, extracted so
// their logic is unit-testable (see dashboard-estimate.check.ts) rather than
// buried inline in the API route.

export const SECTION_WEIGHTS = { SPEAKING: 0.3, WRITING: 0.3, READING: 0.2, LISTENING: 0.2 } as const;
export type Section = keyof typeof SECTION_WEIGHTS;

/**
 * Weighted average of section scores, normalized over only the sections the
 * student has actually practiced (score > 0). A section with zero attempts
 * is "no data", not a score of 0 — treating it as 0 would drag the estimate
 * down for anyone who hasn't yet tried all four sections (i.e. almost every
 * early-stage student).
 */
export function weightedSectionAverage(secAvg: Record<Section, number>): number {
  const sections = Object.keys(SECTION_WEIGHTS) as Section[];
  const practicedWeight = sections
    .filter((s) => secAvg[s] > 0)
    .reduce((sum, s) => sum + SECTION_WEIGHTS[s], 0);
  if (practicedWeight === 0) return 0;
  const weightedSum = sections.reduce((sum, s) => sum + secAvg[s] * SECTION_WEIGHTS[s], 0);
  return weightedSum / practicedWeight;
}

/**
 * Splits items already sorted ascending by score into weak/strong lists,
 * capped at 3 each and at half the available items, so the same item can
 * never appear in both lists (which the naive slice(0,3)/slice(-3) did
 * whenever fewer than 6 items were available).
 */
export function pickWeakStrong<T>(sortedAscending: T[]): { weak: T[]; strong: T[] } {
  const n = Math.min(3, Math.floor(sortedAscending.length / 2));
  return {
    weak: sortedAscending.slice(0, n),
    strong: n > 0 ? sortedAscending.slice(-n).reverse() : [],
  };
}
