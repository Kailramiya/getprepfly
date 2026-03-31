// ============================================================================
// PTE Exam Constants
// ============================================================================

export const PTE_SECTIONS = ["SPEAKING", "WRITING", "READING", "LISTENING"] as const;

export const QUESTION_TYPES_BY_SECTION = {
  SPEAKING: [
    "READ_ALOUD",
    "REPEAT_SENTENCE",
    "DESCRIBE_IMAGE",
    "RETELL_LECTURE",
    "ANSWER_SHORT_QUESTION",
    "RESPOND_TO_SITUATION",
  ],
  WRITING: [
    "SUMMARIZE_WRITTEN_TEXT",
    "WRITE_ESSAY",
  ],
  READING: [
    "READING_MCQ_SINGLE",
    "READING_MCQ_MULTIPLE",
    "REORDER_PARAGRAPHS",
    "READING_FILL_BLANKS_DRAG",
    "READING_FILL_BLANKS_DROPDOWN",
  ],
  LISTENING: [
    "SUMMARIZE_SPOKEN_TEXT",
    "LISTENING_MCQ_SINGLE",
    "LISTENING_MCQ_MULTIPLE",
    "LISTENING_FILL_BLANKS",
    "HIGHLIGHT_CORRECT_SUMMARY",
    "SELECT_MISSING_WORD",
    "WRITE_FROM_DICTATION",
  ],
} as const;

export const QUESTION_TYPE_LABELS: Record<string, string> = {
  READ_ALOUD: "Read Aloud",
  REPEAT_SENTENCE: "Repeat Sentence",
  DESCRIBE_IMAGE: "Describe Image",
  RETELL_LECTURE: "Re-tell Lecture",
  ANSWER_SHORT_QUESTION: "Answer Short Question",
  RESPOND_TO_SITUATION: "Respond to a Situation",
  SUMMARIZE_WRITTEN_TEXT: "Summarize Written Text",
  WRITE_ESSAY: "Write Essay",
  READING_MCQ_SINGLE: "Multiple Choice (Single)",
  READING_MCQ_MULTIPLE: "Multiple Choice (Multiple)",
  REORDER_PARAGRAPHS: "Re-order Paragraphs",
  READING_FILL_BLANKS_DRAG: "Fill in the Blanks (Drag & Drop)",
  READING_FILL_BLANKS_DROPDOWN: "Fill in the Blanks (Dropdown)",
  SUMMARIZE_SPOKEN_TEXT: "Summarize Spoken Text",
  LISTENING_MCQ_SINGLE: "Multiple Choice (Single)",
  LISTENING_MCQ_MULTIPLE: "Multiple Choice (Multiple)",
  LISTENING_FILL_BLANKS: "Fill in the Blanks",
  HIGHLIGHT_CORRECT_SUMMARY: "Highlight Correct Summary",
  SELECT_MISSING_WORD: "Select Missing Word",
  WRITE_FROM_DICTATION: "Write from Dictation",
};

// PTE Score Range
export const PTE_SCORE_MIN = 10;
export const PTE_SCORE_MAX = 90;

// Time limits per question type (seconds)
export const TIME_LIMITS: Record<string, number> = {
  READ_ALOUD: 40,
  REPEAT_SENTENCE: 15,
  DESCRIBE_IMAGE: 40,
  RETELL_LECTURE: 40,
  ANSWER_SHORT_QUESTION: 10,
  RESPOND_TO_SITUATION: 20,
  SUMMARIZE_WRITTEN_TEXT: 600, // 10 minutes
  WRITE_ESSAY: 1200, // 20 minutes
  READING_MCQ_SINGLE: 120,
  READING_MCQ_MULTIPLE: 120,
  REORDER_PARAGRAPHS: 120,
  READING_FILL_BLANKS_DRAG: 120,
  READING_FILL_BLANKS_DROPDOWN: 120,
  SUMMARIZE_SPOKEN_TEXT: 600,
  LISTENING_MCQ_SINGLE: 120,
  LISTENING_MCQ_MULTIPLE: 120,
  LISTENING_FILL_BLANKS: 120,
  HIGHLIGHT_CORRECT_SUMMARY: 120,
  SELECT_MISSING_WORD: 120,
  WRITE_FROM_DICTATION: 60,
};

// Preparation time before speaking (seconds)
export const SPEAKING_PREP_TIME: Record<string, number> = {
  READ_ALOUD: 30,
  REPEAT_SENTENCE: 0,
  DESCRIBE_IMAGE: 25,
  RETELL_LECTURE: 10,
  ANSWER_SHORT_QUESTION: 0,
  RESPOND_TO_SITUATION: 20,
};

// Mock test structure: how many of each type
export const MOCK_TEST_STRUCTURE = {
  SPEAKING: {
    READ_ALOUD: 6,
    REPEAT_SENTENCE: 10,
    DESCRIBE_IMAGE: 3,
    RETELL_LECTURE: 2,
    ANSWER_SHORT_QUESTION: 5,
    RESPOND_TO_SITUATION: 2,
  },
  WRITING: {
    SUMMARIZE_WRITTEN_TEXT: 2,
    WRITE_ESSAY: 1,
  },
  READING: {
    READING_MCQ_SINGLE: 2,
    READING_MCQ_MULTIPLE: 2,
    REORDER_PARAGRAPHS: 2,
    READING_FILL_BLANKS_DRAG: 2,
    READING_FILL_BLANKS_DROPDOWN: 3,
  },
  LISTENING: {
    SUMMARIZE_SPOKEN_TEXT: 1,
    LISTENING_MCQ_SINGLE: 2,
    LISTENING_MCQ_MULTIPLE: 2,
    LISTENING_FILL_BLANKS: 2,
    HIGHLIGHT_CORRECT_SUMMARY: 2,
    SELECT_MISSING_WORD: 2,
    WRITE_FROM_DICTATION: 3,
  },
};

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  FREE: { label: "Free", price: 0, durationDays: 0, features: ["Limited practice", "5 questions/day", "No AI scoring"] },
  VIP_30: { label: "VIP 30 Days", price: 49900, durationDays: 30, features: ["Unlimited practice", "AI scoring", "Mock tests", "Weekly predictions"] },
  VIP_90: { label: "VIP 90 Days", price: 99900, durationDays: 90, features: ["Everything in VIP 30", "Priority support", "Templates library"] },
  VIP_180: { label: "VIP 180 Days", price: 149900, durationDays: 180, features: ["Everything in VIP 90", "Best value", "Vocabulary builder"] },
} as const;

// Centre subscription plans (B2B)
export const CENTRE_PLANS = {
  STARTER: { label: "Starter", maxStudents: 50, monthlyPrice: 300000, features: ["White-label app", "Basic analytics", "Shared question bank"] },
  GROWTH: { label: "Growth", maxStudents: 200, monthlyPrice: 700000, features: ["AI scoring", "Mock tests", "Performance reports", "Batch management"] },
  PRO: { label: "Pro", maxStudents: 500, monthlyPrice: 1500000, features: ["Custom questions", "Prediction lists", "WhatsApp notifications", "Priority support"] },
  ENTERPRISE: { label: "Enterprise", maxStudents: 9999, monthlyPrice: 2500000, features: ["Unlimited students", "Dedicated support", "API access", "Custom features"] },
} as const;
