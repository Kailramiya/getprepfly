// Run: node_modules/.bin/tsx apps/web/src/lib/answer-keys.check.ts
import assert from "node:assert/strict";
import { stripAnswerKeys as strip } from "./answer-keys";

const has = (v: unknown, needle: string) => JSON.stringify(v).includes(needle);

let c: any = strip("READING_MCQ_SINGLE", { options: ["a", "b"], correctAnswer: 1 });
assert.deepEqual(c, { options: ["a", "b"] });

c = strip("REORDER_PARAGRAPHS", { paragraphs: ["x", "y"], correctOrder: [1, 0] });
assert.ok(!("correctOrder" in c));

c = strip("READING_FILL_BLANKS_DROPDOWN", { passage: "a __ b", blanks: [{ correctAnswer: "SECRET", options: ["SECRET", "other"] }] });
assert.deepEqual(c.blanks, [{ options: ["SECRET", "other"] }]);
assert.ok(!has(c.blanks, "correctAnswer"));

c = strip("READING_FILL_BLANKS_DRAG", { blanks: [{ correctAnswer: "one" }, "two", { answer: "three" }] });
assert.deepEqual([...c.blanks].sort(), ["one", "three", "two"]); // bank preserved
assert.ok(c.blanks.every((b: unknown) => typeof b === "string"));

c = strip("LISTENING_FILL_BLANKS", { passage: "__ __", blanks: [{ answer: "SECRET" }, { answer: "x" }], audioUrl: "u" });
assert.ok(!has(c, "SECRET")); assert.equal(c.blanks.length, 2); assert.equal(c.audioUrl, "u");

assert.equal(strip("X", null), null);
console.log("answer-keys: all checks passed");
