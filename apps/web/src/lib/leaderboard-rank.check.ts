// Run: node_modules/.bin/tsx apps/web/src/lib/leaderboard-rank.check.ts
import assert from "node:assert/strict";
import { rankByScore } from "./leaderboard-rank";

// B's true average (74.49) is higher than A's (74.4), even though both
// round to the same displayed "74" and A has more attempts. Ranking must
// follow the raw average, not a post-rounding tie + attempts tiebreak —
// this is the exact case the old "round then sort" code got wrong.
{
  const ranked = rankByScore([
    { userId: "A", rawAvg: 74.4, attempts: 10 },
    { userId: "B", rawAvg: 74.49, attempts: 3 },
  ]);
  assert.equal(ranked[0].userId, "B", "higher true average must rank first even when both round the same");
  assert.equal(ranked[1].userId, "A");
  assert.equal(ranked[0].avgScore, 74);
  assert.equal(ranked[1].avgScore, 74);
}

// Genuine ties (identical raw average) fall back to more attempts first.
{
  const ranked = rankByScore([
    { userId: "C", rawAvg: 80, attempts: 5 },
    { userId: "D", rawAvg: 80, attempts: 12 },
  ]);
  assert.equal(ranked[0].userId, "D");
}

console.log("leaderboard rank: sorts by raw average before rounding, ties broken by attempts");
