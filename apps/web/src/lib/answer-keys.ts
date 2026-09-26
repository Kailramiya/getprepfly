const ANSWER_KEY_FIELDS = ["correctAnswer", "correctAnswers", "correctOrder", "correctText", "incorrectIndices"];

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const blankAnswer = (b: any): string =>
  typeof b === "string" ? b : b && typeof b === "object" ? String(b.correctAnswer || b.answer || "") : "";

// Removes everything that reveals which answer is right, while keeping what the UI
// needs to render (options, word banks). Used for content sent to a student mid-test.
export function stripAnswerKeys(type: string, content: unknown): unknown {
  if (!content || typeof content !== "object") return content;
  const out: Record<string, any> = { ...(content as Record<string, any>) };
  for (const f of ANSWER_KEY_FIELDS) delete out[f];

  if (Array.isArray(out.blanks)) {
    if (type === "READING_FILL_BLANKS_DRAG") {
      // Word bank only: positions are the answer key, so drop them by shuffling.
      out.blanks = shuffled(out.blanks.map(blankAnswer).filter(Boolean));
    } else if (type === "READING_FILL_BLANKS_DROPDOWN") {
      // Per-blank options stay; the marked answer goes. String blanks double as the
      // option list, so shuffle them to hide their positions.
      out.blanks = out.blanks.every((b: any) => typeof b === "string")
        ? shuffled(out.blanks)
        : out.blanks.map((b: any) => {
            if (!b || typeof b !== "object") return b;
            const rest = { ...b };
            delete rest.correctAnswer;
            delete rest.answer;
            return rest;
          });
    } else {
      // LISTENING_FILL_BLANKS (typed answers): only the position count matters.
      out.blanks = out.blanks.map((b: any) => (b && typeof b === "object" ? { ...b, correctAnswer: "", answer: "" } : ""));
    }
  }
  return out;
}
