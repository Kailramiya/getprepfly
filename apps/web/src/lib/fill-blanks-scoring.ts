export function normAns(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

export interface FillBlanksResult {
  marksEarned: number;
  marksTotal: number;
  correct: number;
  total: number;
  mistakes: Array<{ position: number; yourAnswer: string; correctAnswer: string }>;
  expected: string[];
  pending?: boolean;
  message?: string;
}

// Server-side scoring for READING_FILL_BLANKS_DRAG / READING_FILL_BLANKS_DROPDOWN.
export function scoreReadingFillBlanks(
  type: "READING_FILL_BLANKS_DRAG" | "READING_FILL_BLANKS_DROPDOWN",
  content: any,
  modelAnswer: string | null,
  answer: unknown,
  totalMarks: number
): FillBlanksResult {
  const blankCount = String(content?.passage || "").match(/_{2,}|\[blank\]|\{\{\s*blank\s*\}\}/gi)?.length ?? 0;
  const rawBlanks: string[] = (Array.isArray(content?.blanks) ? content.blanks : []).map((b: any) =>
    typeof b === "string" ? b : b && typeof b === "object" ? String(b.correctAnswer || b.answer || "") : ""
  );
  const given: Array<string | null> = Array.isArray(answer) ? answer : [];

  let expected = rawBlanks;
  let total = rawBlanks.length || 1;
  let same = (a: string, b: string) => normAns(a) === normAns(b);
  let pending = false;

  if (type === "READING_FILL_BLANKS_DRAG") {
    same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const flatWordCount = rawBlanks.reduce(
      (n, b) => n + (b.includes(" ") ? b.split(/\s+/).filter(Boolean).length : b ? 1 : 0),
      0
    );
    if (blankCount > 0 && flatWordCount > blankCount) {
      // Blanks hold a word bank, not per-blank answers: the real answers live in modelAnswer.
      const modelAnswers = (modelAnswer || "")
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => s && !/correct answers?/i.test(s) && !/model answer/i.test(s));
      total = blankCount;
      if (modelAnswers.length >= blankCount) expected = modelAnswers;
      else pending = true;
    }
  }

  const mistakes: FillBlanksResult["mistakes"] = [];
  let correct = 0;
  if (!pending) {
    for (let i = 0; i < total; i++) {
      const ca = (expected[i] || "").trim();
      const ua = (given[i] || "").trim();
      if (ca && same(ua, ca)) correct++;
      else mistakes.push({ position: i + 1, yourAnswer: ua || "(empty)", correctAnswer: ca || "—" });
    }
  }

  return {
    marksEarned: Math.round(totalMarks * (correct / total) * 10) / 10,
    marksTotal: totalMarks,
    correct,
    total,
    mistakes,
    expected,
    ...(pending && {
      pending: true,
      message: "Submitted for teacher review. Add a model answer to enable auto-scoring.",
    }),
  };
}
