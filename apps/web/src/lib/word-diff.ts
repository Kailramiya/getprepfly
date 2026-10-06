/**
 * Word-level alignment for Read Aloud / Repeat Sentence feedback.
 *
 * Comparing word i to word i makes one skipped or extra word mark everything after it wrong.
 * This aligns the two word lists by minimum edit distance (like `git diff`), so each word is
 * classed as matched, wrong (substituted), missed (never said) or extra (said but not in the text).
 */

export type DiffOp =
  | { type: "match"; word: string }
  | { type: "wrong"; expected: string; actual: string }
  | { type: "missed"; expected: string }
  | { type: "extra"; actual: string };

/** Below this share of matched words the recording isn't treated as a real attempt. */
export const UNCLEAR_MATCH_RATIO = 0.2;

export const toWords = (s: string): string[] =>
  s.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);

export function diffWords(expected: string[], actual: string[]): DiffOp[] {
  const n = expected.length;
  const m = actual.length;
  // cost[i][j] = edit distance between expected[i..] and actual[j..]
  const cost = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      if (i === n) cost[i][j] = m - j;
      else if (j === m) cost[i][j] = n - i;
      else {
        cost[i][j] = Math.min(
          cost[i + 1][j + 1] + (expected[i] === actual[j] ? 0 : 1),
          cost[i + 1][j] + 1,
          cost[i][j + 1] + 1
        );
      }
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && expected[i] === actual[j] && cost[i][j] === cost[i + 1][j + 1]) {
      ops.push({ type: "match", word: expected[i] });
      i++; j++;
    } else if (i < n && j < m && cost[i][j] === cost[i + 1][j + 1] + 1) {
      ops.push({ type: "wrong", expected: expected[i], actual: actual[j] });
      i++; j++;
    } else if (i < n && cost[i][j] === cost[i + 1][j] + 1) {
      ops.push({ type: "missed", expected: expected[i] });
      i++;
    } else {
      ops.push({ type: "extra", actual: actual[j] });
      j++;
    }
  }
  return ops;
}

export interface DiffStats {
  expectedCount: number;
  matched: number;
  wrong: number;
  missed: number;
  extra: number;
  /** matched / expectedCount, 0..1 */
  ratio: number;
}

export function diffStats(ops: DiffOp[]): DiffStats {
  const c = { match: 0, wrong: 0, missed: 0, extra: 0 };
  for (const op of ops) c[op.type]++;
  const expectedCount = c.match + c.wrong + c.missed;
  return { expectedCount, matched: c.match, wrong: c.wrong, missed: c.missed, extra: c.extra, ratio: expectedCount ? c.match / expectedCount : 0 };
}

export interface WordMistake {
  position: number;
  /** Set when a run of consecutive missed words is reported as one entry. */
  endPosition?: number;
  yourAnswer: string;
  correctAnswer: string;
}

/** One entry per wrong word, one per run of missed words (not one per missed word). */
export function diffMistakes(ops: DiffOp[]): WordMistake[] {
  const out: WordMistake[] = [];
  let pos = 0; // 0-based index into the expected text
  let run: { start: number; words: string[] } | null = null;
  const flush = () => {
    if (!run) return;
    out.push({
      position: run.start + 1,
      ...(run.words.length > 1 && { endPosition: run.start + run.words.length }),
      yourAnswer: "(missed)",
      correctAnswer: run.words.join(" "),
    });
    run = null;
  };
  for (const op of ops) {
    if (op.type === "missed") {
      run ??= { start: pos, words: [] };
      run.words.push(op.expected);
      pos++;
      continue;
    }
    flush();
    if (op.type === "wrong") {
      out.push({ position: pos + 1, yourAnswer: op.actual, correctAnswer: op.expected });
      pos++;
    } else if (op.type === "match") pos++;
  }
  flush();
  return out;
}
