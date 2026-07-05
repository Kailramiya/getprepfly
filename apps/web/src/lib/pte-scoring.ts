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
  READ_ALOUD:                { speaking:  8, listening:  0, reading:  5, writing:  0 },
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

export const PTE_MIN_SCORE = 10;

/**
 * Legacy Leniency factor (deprecated for new raw point scoring)
 */
export const LENIENCY_FACTOR = 0.15;

export function calculateSkillScores(
  attempts: Array<{
    overallScore: number | null;
    rawPointsEarned?: number | null;
    maxPointsPossible?: number | null;
    scores?: any;
    questionType: string;
    questionSection: string; // SPEAKING | WRITING | READING | LISTENING
  }>
): Record<SkillKey, number> {
  const earned:    Record<SkillKey, number> = { speaking: 0, listening: 0, reading: 0, writing: 0 };
  const possible:  Record<SkillKey, number> = { speaking: 0, listening: 0, reading: 0, writing: 0 };

  for (const attempt of attempts) {
    const isLegacy = attempt.rawPointsEarned == null || attempt.maxPointsPossible == null;
    if (isLegacy && attempt.overallScore === null) continue;

    const contrib = SKILL_CONTRIBUTIONS[attempt.questionType];

    if (contrib) {
      if (!isLegacy) {
        const t = attempt.questionType;
        const s = (attempt.scores as any) || {};

        // ─── TRAIT-TO-SKILL ROUTING ───
        if (t === "READ_ALOUD") {
          earned.reading += s.rawContent || 0; possible.reading += 5;
          earned.speaking += (s.rawFluency || 0) + (s.rawPronunciation || 0); possible.speaking += 10;
        } else if (t === "REPEAT_SENTENCE") {
          earned.listening += s.rawContent || 0; possible.listening += 3;
          earned.speaking += (s.rawFluency || 0) + (s.rawPronunciation || 0); possible.speaking += 10;
        } else if (t === "RETELL_LECTURE" || t === "SUMMARIZE_GROUP_DISCUSSION") {
          earned.listening += s.rawContent || 0; possible.listening += 5;
          earned.speaking += (s.rawFluency || 0) + (s.rawPronunciation || 0); possible.speaking += 10;
        } else if (t === "SUMMARIZE_WRITTEN_TEXT") {
          earned.reading += s.rawContent || 0; possible.reading += 2;
          earned.writing += (s.rawForm || 0) + (s.rawGrammar || 0) + (s.rawVocabulary || 0); possible.writing += 5;
        } else if (t === "SUMMARIZE_SPOKEN_TEXT") {
          earned.listening += s.rawContent || 0; possible.listening += 2;
          earned.writing += (s.rawForm || 0) + (s.rawGrammar || 0) + (s.rawVocabulary || 0) + (s.rawSpelling || 0); possible.writing += 8;
        } else {
          // Standard raw accumulation
          for (const skill of SKILL_KEYS) {
            const w = contrib[skill];
            if (w > 0) {
              earned[skill] += attempt.rawPointsEarned!;
              possible[skill] += attempt.maxPointsPossible!;
            }
          }
        }
      } else {
        // Legacy Logic
        for (const skill of SKILL_KEYS) {
          const w = contrib[skill];
          if (w > 0) {
            const normalized = attempt.overallScore! / 90;
            earned[skill] += normalized * w;
            possible[skill] += w;
          }
        }
      }
    } else {
      // Unknown type — contribute to its own section
      const fallbackSkill = sectionToSkill(attempt.questionSection);
      if (fallbackSkill) {
        if (!isLegacy) {
          earned[fallbackSkill] += attempt.rawPointsEarned!;
          possible[fallbackSkill] += attempt.maxPointsPossible!;
        } else {
          const FALLBACK_WEIGHT = 10;
          const normalized = attempt.overallScore! / 90;
          earned[fallbackSkill] += normalized * FALLBACK_WEIGHT;
          possible[fallbackSkill] += FALLBACK_WEIGHT;
        }
      }
    }
  }

  const result: Record<SkillKey, number> = { speaking: 0, listening: 0, reading: 0, writing: 0 };
  for (const skill of SKILL_KEYS) {
    if (possible[skill] === 0) { result[skill] = 0; continue; }
    const fraction = earned[skill] / possible[skill];
    
    // Scale: 10 + round(Fraction * 80)
    result[skill] = Math.min(90, Math.max(10, 10 + Math.round(fraction * 80)));
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
