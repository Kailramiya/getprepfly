// Run: node_modules/.bin/tsx apps/web/src/lib/dashboard-estimate.check.ts
import assert from "node:assert/strict";
import { weightedSectionAverage, pickWeakStrong, attemptWeightedAverage } from "./dashboard-estimate";

// A student who has only practiced Speaking (avg 80) must not be dragged
// down by untouched sections being treated as a score of 0.
assert.equal(weightedSectionAverage({ SPEAKING: 80, WRITING: 0, READING: 0, LISTENING: 0 }), 80);

// Two practiced sections average correctly, weighted by their own ratio
// (SPEAKING .3 + WRITING .3 -> 80*.3 + 60*.3 = 42, / .6 = 70).
assert.equal(weightedSectionAverage({ SPEAKING: 80, WRITING: 60, READING: 0, LISTENING: 0 }), 70);

// No data at all -> 0 (the caller treats this as "no estimate yet").
assert.equal(weightedSectionAverage({ SPEAKING: 0, WRITING: 0, READING: 0, LISTENING: 0 }), 0);

// All four practiced at the same score -> unchanged from the original
// 30/30/20/20 weighting (weights sum to 1, so this is just that score).
assert.equal(weightedSectionAverage({ SPEAKING: 80, WRITING: 80, READING: 80, LISTENING: 80 }), 80);

// Weak/strong must never share an item, for any amount of data.
for (let n = 0; n <= 8; n++) {
  const items = Array.from({ length: n }, (_, i) => i);
  const { weak, strong } = pickWeakStrong(items);
  const overlap = weak.filter((w) => strong.includes(w));
  assert.deepEqual(overlap, [], `n=${n}: weak/strong overlap at ${JSON.stringify(overlap)}`);
}

// With exactly 2 qualifying types, each list gets exactly the one item it
// should (previously both lists showed both types).
{
  const { weak, strong } = pickWeakStrong([10, 90]);
  assert.deepEqual(weak, [10]);
  assert.deepEqual(strong, [90]);
}

// With only 1 qualifying type, neither list claims it (nothing to compare
// it against yet) rather than calling it both weakest and strongest.
{
  const { weak, strong } = pickWeakStrong([42]);
  assert.deepEqual(weak, []);
  assert.deepEqual(strong, []);
}

// A section explored across more distinct sub-types must not skew the
// overall average just because it has more groups — attempt count is what
// should matter, not how many types happen to exist in that section.
// 8 Listening attempts avg 90, 2 Writing attempts avg 50:
// true mean = (90*8 + 50*2) / 10 = 82, NOT the per-type mean of (90+50)/2 = 70.
assert.equal(
  attemptWeightedAverage([{ avgScore: 90, count: 8 }, { avgScore: 50, count: 2 }]),
  82
);

// Many small groups vs one big group with the same per-group average still
// reduces to that average (sanity check: uniform scores -> uniform result
// regardless of how the attempts are split into groups).
assert.equal(
  attemptWeightedAverage([{ avgScore: 70, count: 1 }, { avgScore: 70, count: 1 }, { avgScore: 70, count: 5 }]),
  70
);

// No groups -> 0 (caller's "no data yet" case).
assert.equal(attemptWeightedAverage([]), 0);

console.log("dashboard estimate: weighted average, attempt-weighted average and weak/strong dedup all correct");
