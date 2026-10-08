// Run: npx tsx apps/web/src/lib/word-diff.check.ts
import assert from "node:assert/strict";
import { diffWords, diffStats, diffMistakes, toWords, UNCLEAR_MATCH_RATIO } from "./word-diff";

const exp = toWords("The mass media, such as television, have an influence on people.");

// Perfect read
let ops = diffWords(exp, [...exp]);
assert.equal(diffStats(ops).ratio, 1);
assert.equal(diffMistakes(ops).length, 0);

// Two extra words up front must NOT misalign the rest (the old positional bug)
ops = diffWords(exp, ["um", "so", ...exp]);
assert.equal(diffMistakes(ops).length, 0);
assert.equal(diffStats(ops).extra, 2);

// One skipped word = one missed mistake, everything after still matches
const skipped = exp.filter((_, i) => i !== 3);
ops = diffWords(exp, skipped);
let mistakes = diffMistakes(ops);
assert.equal(mistakes.length, 1);
assert.equal(mistakes[0].yourAnswer, "(missed)");
assert.equal(mistakes[0].correctAnswer, exp[3]);
assert.equal(mistakes[0].position, 4);

// A mispronounced word is "wrong", not missed
ops = diffWords(exp, exp.map((w, i) => (i === 2 ? "xyz" : w)));
mistakes = diffMistakes(ops);
assert.deepEqual(mistakes, [{ position: 3, yourAnswer: "xyz", correctAnswer: exp[2] }]);

// A missed tail is grouped into one entry
ops = diffWords(exp, exp.slice(0, 4));
mistakes = diffMistakes(ops);
assert.equal(mistakes.length, 1);
assert.equal(mistakes[0].position, 5);
assert.equal(mistakes[0].endPosition, exp.length);

// Unrelated speech (noise hallucination) falls under the unclear threshold
ops = diffWords(exp, toWords("he has a lot of money he will get 10000 rupees"));
assert.ok(diffStats(ops).ratio < UNCLEAR_MATCH_RATIO);

// Empty transcript
assert.equal(diffStats(diffWords(exp, [])).ratio, 0);

console.log("word-diff checks passed");
