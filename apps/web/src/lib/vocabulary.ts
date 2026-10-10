// Pure helpers for the Vocabulary Builder, extracted so they're unit-testable
// (see vocabulary.check.ts) instead of buried inline in the page.

export interface DayPickable {
  id: string;
  dayNumber?: number | null;
}

/**
 * Stable partition: unmastered words first, then mastered — nothing is ever
 * removed from either list (Word List or Flashcards), just reordered, so a
 * mastered word is still reachable for review rather than disappearing.
 * Array.prototype.sort is stable (guaranteed since ES2019), so relative
 * order within each group is preserved.
 */
export function sortByMastery<T extends { id: string }>(vocab: T[], masteredIds: ReadonlySet<string>): T[] {
  return [...vocab].sort((a, b) => Number(masteredIds.has(a.id)) - Number(masteredIds.has(b.id)));
}

/**
 * Deterministic "today's word": the same word for every student on a given
 * calendar day, rotating through admin-curated dayNumber words if any exist
 * (sorted by dayNumber), falling back to the whole list so the feature works
 * before anyone curates specific days.
 */
export function pickWordOfDay<T extends DayPickable>(vocab: T[], now: number = Date.now()): T | null {
  if (vocab.length === 0) return null;
  const dayWords = vocab.filter((v) => v.dayNumber != null).sort((a, b) => a.dayNumber! - b.dayNumber!);
  const pool = dayWords.length > 0 ? dayWords : vocab;
  const daysSinceEpoch = Math.floor(now / 86400000);
  return pool[daysSinceEpoch % pool.length];
}
