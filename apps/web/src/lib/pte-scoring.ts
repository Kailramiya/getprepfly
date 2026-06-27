/**
 * PTE Academic cross-skill scoring model — New Patterns.
 *
 * Each question type contributes marks to one or more of the four skills
 * (Speaking, Listening, Reading, Writing). Weights are absolute marks
 * taken from the official PTE New Patterns score guide. Each skill sums
 * to 90 across a complete mock test.
 *
 * Key rule: a question type ONLY scores the skills listed in the table.
 * For example Read Aloud scores Speaking only (not Reading), and
 * Listening Fill Blanks scores Listening only (not Writing).
 */

export interface SkillContribution {
  speaking:  number;
  listening: number;
  reading:   number;
  writing:   number;
}

/**
 * Absolute mark weights for each PTE question type per skill.
 * A question type only appears in one section but may feed multiple skills.
 * Weights reflect the official mark distribution across a full exam.
 */
export const SKILL_CONTRIBUTIONS: Record<string, SkillContribution> = {
  // ─── SPEAKING SECTION ─────────────────────────────────────────────────────
  READ_ALOUD:                { speaking:  8, listening:  0, reading:  0, writing:  0 },
  REPEAT_SENTENCE:           { speaking: 14, listening: 15, reading:  0, writing:  0 },
  DESCRIBE_IMAGE:            { speaking: 28, listening:  0, reading:  0, writing:  0 },
  RETELL_LECTURE:            { speaking: 11, listening: 12, reading:  0, writing:  0 },
  ANSWER_SHORT_QUESTION:     { speaking:  0, listening:  3, reading:  0, writing:  0 },
  SUMMARIZE_GROUP_DISCUSSION:{ speaking: 17, listening: 18, reading:  0, writing:  0 },
  RESPOND_TO_SITUATION:      { speaking: 12, listening:  0, reading:  0, writing:  0 },

  // ─── WRITING SECTION ──────────────────────────────────────────────────────
  SUMMARIZE_WRITTEN_TEXT:    { speaking:  0, listening:  0, reading: 20, writing: 25 },
  WRITE_ESSAY:               { speaking:  0, listening:  0, reading:  0, writing: 28 },

  // ─── READING SECTION ──────────────────────────────────────────────────────
  READING_FILL_BLANKS_DROPDOWN: { speaking: 0, listening:  0, reading: 25, writing:  0 },
  READING_MCQ_MULTIPLE:         { speaking: 0, listening:  0, reading:  4, writing:  0 },
  REORDER_PARAGRAPHS:           { speaking: 0, listening:  0, reading:  8, writing:  0 },
  READING_FILL_BLANKS_DRAG:     { speaking: 0, listening:  0, reading: 17, writing:  0 },
  READING_MCQ_SINGLE:           { speaking: 0, listening:  0, reading:  2, writing:  0 },

  // ─── LISTENING SECTION ────────────────────────────────────────────────────
  SUMMARIZE_SPOKEN_TEXT:        { speaking: 0, listening:  9, reading:  0, writing: 17 },
  LISTENING_MCQ_MULTIPLE:       { speaking: 0, listening:  3, reading:  0, writing:  0 },
  LISTENING_FILL_BLANKS:        { speaking: 0, listening:  7, reading:  0, writing:  0 },
  LISTENING_MCQ_SINGLE:         { speaking: 0, listening:  1.5, reading: 0, writing:  0 },
  SELECT_MISSING_WORD:          { speaking: 0, listening:  1, reading:  0, writing:  0 },
  HIGHLIGHT_CORRECT_SUMMARY:    { speaking: 0, listening:  1.5, reading: 2, writing:  0 },
  HIGHLIGHT_INCORRECT_WORDS:    { speaking: 0, listening:  7, reading: 12, writing:  0 },
  WRITE_FROM_DICTATION:         { speaking: 0, listening: 12, reading:  0, writing: 20 },
};

export type SkillKey = "speaking" | "listening" | "reading" | "writing";
export const SKILL_KEYS: SkillKey[] = ["speaking", "listening", "reading", "writing"];

/** Minimum score applied to every skill and overall when a mock test is completed. */
export const PTE_MIN_SCORE = 22;

/**
 * Calculate four skill scores (0–90 each) from a list of attempts.
 *
 * Algorithm (weighted average per skill):
 *   skillScore = (Σ normalizedScore × weight) / (Σ weight) × 90
 *
 *   normalizedScore = attempt.overallScore / 90  (already on 0–90 PTE scale)
 *   weight          = SKILL_CONTRIBUTIONS[questionType][skill]
 *
 * Attempts without an overallScore (unscored/auto-saved) are skipped.
 * Question types not in SKILL_CONTRIBUTIONS fall back to their section tag.
 */
export function calculateSkillScores(
  attempts: Array<{
    overallScore: number | null;
    questionType: string;
    questionSection: string; // SPEAKING | WRITING | READING | LISTENING
  }>
): Record<SkillKey, number> {
  const weighted:    Record<SkillKey, number> = { speaking: 0, listening: 0, reading: 0, writing: 0 };
  const totalWeight: Record<SkillKey, number> = { speaking: 0, listening: 0, reading: 0, writing: 0 };

  for (const attempt of attempts) {
    if (attempt.overallScore === null) continue;

    const normalized = attempt.overallScore / 90;
    const contrib = SKILL_CONTRIBUTIONS[attempt.questionType];

    if (contrib) {
      for (const skill of SKILL_KEYS) {
        const w = contrib[skill];
        if (w > 0) {
          weighted[skill]    += normalized * w;
          totalWeight[skill] += w;
        }
      }
    } else {
      // Unknown type — contribute to its own section, but with a MODEST weight.
      // (A large weight here would let one unmapped question dominate the whole
      // skill score vs the real per-type weights, which range ~1.5–28.)
      const fallbackSkill = sectionToSkill(attempt.questionSection);
      if (fallbackSkill) {
        const FALLBACK_WEIGHT = 10;
        weighted[fallbackSkill]    += normalized * FALLBACK_WEIGHT;
        totalWeight[fallbackSkill] += FALLBACK_WEIGHT;
      }
    }
  }

  const result: Record<SkillKey, number> = { speaking: 0, listening: 0, reading: 0, writing: 0 };
  for (const skill of SKILL_KEYS) {
    result[skill] = totalWeight[skill] > 0
      ? Math.round((weighted[skill] / totalWeight[skill]) * 90)
      : 0;
  }
  return result;
}

function sectionToSkill(section: string): SkillKey | null {
  switch (section) {
    case "SPEAKING":  return "speaking";
    case "WRITING":   return "writing";
    case "READING":   return "reading";
    case "LISTENING": return "listening";
    default: return null;
  }
}
