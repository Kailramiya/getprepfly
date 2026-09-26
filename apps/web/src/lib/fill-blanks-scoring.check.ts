// Run: npx tsx apps/web/src/lib/fill-blanks-scoring.check.ts
import assert from "node:assert/strict";
import { scoreReadingFillBlanks as score } from "./fill-blanks-scoring";

const passage = "The __ dog __ over the __ fence.";

// Dropdown: rich blanks, case/punctuation-insensitive match
let r = score("READING_FILL_BLANKS_DROPDOWN", { passage, blanks: [{ correctAnswer: "quick" }, "jumped", { answer: "tall" }] }, null, ["Quick", "jumped.", "short"], 3);
assert.equal(r.correct, 2); assert.equal(r.marksEarned, 2); assert.equal(r.mistakes.length, 1);

// Dropdown: empty answers never count as correct, even when key is empty
r = score("READING_FILL_BLANKS_DROPDOWN", { passage, blanks: ["", "b", "c"] }, null, ["", "b", "c"], 3);
assert.equal(r.correct, 2);

// Drag, per-blank answers
r = score("READING_FILL_BLANKS_DRAG", { passage, blanks: ["quick", "jumped", "tall"] }, null, ["quick", "jumped", "tall"], 3);
assert.equal(r.marksEarned, 3);

// Drag, word-bank mode (more words than blanks) uses modelAnswer
const bank = { passage, blanks: ["quick jumped tall extra1 extra2"] };
r = score("READING_FILL_BLANKS_DRAG", bank, "quick, jumped, tall", ["quick", "jumped", "extra1"], 3);
assert.equal(r.correct, 2); assert.equal(r.total, 3); assert.equal(r.pending, undefined);

// Drag, word-bank mode without a model answer -> pending, zero marks
r = score("READING_FILL_BLANKS_DRAG", bank, null, ["quick", "jumped", "tall"], 3);
assert.equal(r.pending, true); assert.equal(r.marksEarned, 0);

// Junk / tampered answer shapes never throw and score zero
r = score("READING_FILL_BLANKS_DROPDOWN", { passage, blanks: ["a", "b", "c"] }, null, { evil: 1 }, 3);
assert.equal(r.marksEarned, 0);

console.log("fill-blanks-scoring: all checks passed");
