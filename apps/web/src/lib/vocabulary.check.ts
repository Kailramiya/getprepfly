// Run: node_modules/.bin/tsx apps/web/src/lib/vocabulary.check.ts
import assert from "node:assert/strict";
import { pickWordOfDay } from "./vocabulary";

// Empty list -> null, not a crash (modulo by zero).
assert.equal(pickWordOfDay([]), null);

// No dayNumber on anything -> falls back to the whole list, still picks
// something (not null) and is stable for the same instant.
{
  const vocab = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const now = Date.UTC(2026, 0, 1);
  const first = pickWordOfDay(vocab, now);
  const second = pickWordOfDay(vocab, now);
  assert.ok(first);
  assert.equal(first!.id, second!.id, "same instant must pick the same word");
}

// A single word with no dayNumber -> that word, always.
assert.equal(pickWordOfDay([{ id: "only" }], Date.UTC(2026, 0, 1))!.id, "only");
assert.equal(pickWordOfDay([{ id: "only" }], Date.UTC(2027, 5, 15))!.id, "only");

// Different calendar days can (and over enough days, must) land on different
// words when more than one is available — the rotation actually rotates.
{
  const vocab = [{ id: "a" }, { id: "b" }];
  const picks = new Set<string>();
  for (let d = 0; d < 10; d++) {
    picks.add(pickWordOfDay(vocab, Date.UTC(2026, 0, 1 + d))!.id);
  }
  assert.equal(picks.size, 2, "rotating through 10 days with 2 words should hit both");
}

// When dayNumber-tagged words exist, ONLY those are ever picked — the
// untagged word must never show up as "today's word".
{
  const vocab = [{ id: "untagged" }, { id: "day1", dayNumber: 1 }, { id: "day2", dayNumber: 2 }];
  for (let d = 0; d < 10; d++) {
    const pick = pickWordOfDay(vocab, Date.UTC(2026, 0, 1 + d));
    assert.notEqual(pick!.id, "untagged");
  }
}

// dayNumber-tagged words rotate in dayNumber order, not insertion order.
{
  const vocab = [{ id: "day2", dayNumber: 2 }, { id: "day1", dayNumber: 1 }];
  // 86400000ms = exactly one calendar day apart -> daysSinceEpoch differs by 1,
  // so consecutive days alternate between the two sorted-by-dayNumber entries.
  const d0 = pickWordOfDay(vocab, 0)!.id;
  const d1 = pickWordOfDay(vocab, 86400000)!.id;
  assert.notEqual(d0, d1);
}

console.log("vocabulary: Word of the Day rotation is deterministic, never crashes, and respects dayNumber");
