// Pure ranking helper for the leaderboard, extracted so the rounding-order
// correctness is unit-testable (see leaderboard-rank.check.ts).

/**
 * Ranks entries by their RAW average score, then rounds only for display.
 * Rounding before sorting would collapse two genuinely different averages
 * (e.g. 74.4 vs 74.49 — both round to 74) into an apparent tie, letting the
 * attempts tiebreak wrongly promote whoever practiced more over whoever
 * actually scored higher.
 */
export function rankByScore(
  entries: Array<{ userId: string; rawAvg: number; attempts: number }>
): Array<{ userId: string; avgScore: number; attempts: number }> {
  return [...entries]
    .sort((a, b) => b.rawAvg - a.rawAvg || b.attempts - a.attempts)
    .map((e) => ({ userId: e.userId, avgScore: Math.round(e.rawAvg), attempts: e.attempts }));
}
