// Pure helper for the Vocabulary Builder's Word of the Day, extracted so the
// rotation logic is unit-testable (see vocabulary.check.ts).

export interface DayPickable {
  id: string;
  dayNumber?: number | null;
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
