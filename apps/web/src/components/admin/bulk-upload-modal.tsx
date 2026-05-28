"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, XCircle, Upload, Download, AlertTriangle,
  FileText, X, ChevronDown, ChevronUp, Mic, PenTool, BookOpen, Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedQuestion {
  section: string;
  type: string;
  title: string;
  difficulty: string;
  content: any;
  explanation: string | null;
  modelAnswer: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  tags: string[];
  isPrediction: boolean;
}

interface RowResult {
  rowNum: number;
  rawTitle: string;
  errors: string[];
  question: ParsedQuestion | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const norm = (v: string | undefined) => (v ?? "").trim();
const parseBool = (v: string) => ["true", "1", "yes", "y"].includes((v ?? "").toLowerCase().trim());
const parseTags = (v: string) => (v ? v.split(",").map((t) => t.trim()).filter(Boolean) : []);
const parseDiff = (v: string): string => {
  const d = (v ?? "").trim().toUpperCase();
  return ["EASY", "MEDIUM", "HARD"].includes(d) ? d : "MEDIUM";
};

function baseQ(
  row: Record<string, string>,
  section: string,
  type: string,
  extra: Partial<ParsedQuestion> = {}
): ParsedQuestion {
  return {
    section,
    type,
    title: norm(row.title) || `${type.replace(/_/g, " ")} Question`,
    difficulty: parseDiff(row.difficulty ?? "MEDIUM"),
    explanation: norm(row.explanation) || null,
    modelAnswer: norm(row.model_answer) || null,
    audioUrl: norm(row.audio_url) || null,
    imageUrl: norm(row.image_url) || null,
    tags: parseTags(row.tags ?? ""),
    isPrediction: parseBool(row.is_prediction ?? "false"),
    content: {},
    ...extra,
  };
}

function req(row: Record<string, string>, field: string, label: string, errors: string[]) {
  if (!norm(row[field])) errors.push(`"${label}" is required`);
}

function parseOptions(row: Record<string, string>): string[] {
  return [row.option_1, row.option_2, row.option_3, row.option_4, row.option_5]
    .map((o) => norm(o))
    .filter(Boolean);
}

function parseSingleCorrect(row: Record<string, string>, options: string[], errors: string[]): number {
  const ci = parseInt(norm(row.correct_option), 10) - 1;
  if (isNaN(ci) || ci < 0 || ci >= options.length)
    errors.push(`correct_option must be a number 1–${options.length}`);
  return ci;
}

const TAIL = ["tags", "is_prediction", "explanation", "model_answer"];
const TAIL_EX = ["vocabulary,reading", "false", "Optional explanation", ""];

// ─── Type Configs ─────────────────────────────────────────────────────────────

interface TypeConfig {
  section: string;
  label: string;
  headers: string[];
  example: string[];
  notes: string[];
  parse(row: Record<string, string>): { question: ParsedQuestion | null; errors: string[] };
}

const T: Record<string, TypeConfig> = {
  READ_ALOUD: {
    section: "SPEAKING",
    label: "Read Aloud",
    headers: ["title", "difficulty", "text", ...TAIL],
    example: [
      "Read Aloud - Climate",
      "MEDIUM",
      "The rapid increase in global temperatures has led to unprecedented changes in weather patterns.",
      ...TAIL_EX,
    ],
    notes: [
      "text — The full passage the student must read aloud (required)",
      "difficulty — EASY / MEDIUM / HARD (default: MEDIUM)",
      "tags — Comma-separated (e.g. science,climate)",
      "is_prediction — true or false",
      "model_answer — Leave blank (auto-scored by AI)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "text", "text", errors);
      if (errors.length) return { question: null, errors };
      return { question: baseQ(row, "SPEAKING", "READ_ALOUD", { content: { text: norm(row.text) } }), errors: [] };
    },
  },

  REPEAT_SENTENCE: {
    section: "SPEAKING",
    label: "Repeat Sentence",
    headers: ["title", "difficulty", "audio_url", "transcript", ...TAIL],
    example: [
      "Repeat - Weather",
      "MEDIUM",
      "https://example.com/audio.mp3",
      "The weather has been quite unpredictable this year.",
      ...TAIL_EX,
    ],
    notes: [
      "audio_url — Direct URL to the audio file (required)",
      "transcript — The spoken sentence (used for admin review & scoring)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "SPEAKING", "REPEAT_SENTENCE", {
          content: { transcript: norm(row.transcript) },
        }),
        errors: [],
      };
    },
  },

  DESCRIBE_IMAGE: {
    section: "SPEAKING",
    label: "Describe Image",
    headers: ["title", "difficulty", "image_url", ...TAIL],
    example: [
      "Bar Chart - Energy Usage",
      "MEDIUM",
      "https://example.com/chart.png",
      "graphs,charts",
      "false",
      "",
      "The chart shows coal dominates energy use, with renewables growing steadily.",
    ],
    notes: [
      "image_url — Direct URL to the image (required)",
      "model_answer — A sample description (recommended for student review)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "image_url", "image_url", errors);
      if (errors.length) return { question: null, errors };
      return { question: baseQ(row, "SPEAKING", "DESCRIBE_IMAGE", { content: {} }), errors: [] };
    },
  },

  RETELL_LECTURE: {
    section: "SPEAKING",
    label: "Re-tell Lecture",
    headers: ["title", "difficulty", "audio_url", "transcript", ...TAIL],
    example: [
      "Lecture - Economic Policy",
      "HARD",
      "https://example.com/lecture.mp3",
      "In today's lecture we discuss the impact of monetary policy on inflation...",
      "economics",
      "false",
      "",
      "The lecture explained how monetary policy affects inflation and interest rates.",
    ],
    notes: [
      "audio_url — Direct URL to the lecture audio (required)",
      "transcript — Full transcript (shown to admin, used for scoring context)",
      "model_answer — Sample re-tell answer (recommended)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "SPEAKING", "RETELL_LECTURE", {
          content: { transcript: norm(row.transcript) },
        }),
        errors: [],
      };
    },
  },

  ANSWER_SHORT_QUESTION: {
    section: "SPEAKING",
    label: "Answer Short Question",
    headers: ["title", "difficulty", "audio_url", "transcript", "correct_answer", ...TAIL],
    example: [
      "Capital of Australia",
      "EASY",
      "https://example.com/q.mp3",
      "What is the capital of Australia?",
      "Canberra",
      "general-knowledge",
      "false",
      "",
      "",
    ],
    notes: [
      "audio_url — URL of the question audio (required)",
      "transcript — The spoken question",
      "correct_answer — Expected short answer (required, stored as model answer)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      req(row, "correct_answer", "correct_answer", errors);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "SPEAKING", "ANSWER_SHORT_QUESTION", {
          content: { transcript: norm(row.transcript) },
          modelAnswer: norm(row.correct_answer),
        }),
        errors: [],
      };
    },
  },

  SUMMARIZE_WRITTEN_TEXT: {
    section: "WRITING",
    label: "Summarize Written Text",
    headers: ["title", "difficulty", "text", ...TAIL],
    example: [
      "Summarize - Climate",
      "HARD",
      "Climate change refers to long-term shifts in global temperatures and weather patterns. Since the 1800s...",
      "writing,environment",
      "false",
      "",
      "Climate change involves long-term shifts in temperature caused largely by human activity.",
    ],
    notes: [
      "text — The passage to summarize (required)",
      "model_answer — Sample one-sentence summary (recommended for scoring reference)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "text", "text", errors);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "WRITING", "SUMMARIZE_WRITTEN_TEXT", {
          content: { text: norm(row.text) },
        }),
        errors: [],
      };
    },
  },

  WRITE_ESSAY: {
    section: "WRITING",
    label: "Write Essay",
    headers: ["title", "difficulty", "prompt", "word_limit", ...TAIL],
    example: [
      "Essay - Technology",
      "HARD",
      "Do you think technology has made our lives better or worse? Discuss both views.",
      "200",
      "writing,technology",
      "false",
      "",
      "Technology has both improved convenience and created new social challenges...",
    ],
    notes: [
      "prompt — The essay question (required)",
      "word_limit — Minimum word count (default: 200)",
      "model_answer — Sample essay (recommended)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "prompt", "prompt", errors);
      const wl = parseInt(row.word_limit || "200", 10);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "WRITING", "WRITE_ESSAY", {
          content: { prompt: norm(row.prompt), wordLimit: isNaN(wl) ? 200 : wl },
        }),
        errors: [],
      };
    },
  },

  READING_MCQ_SINGLE: {
    section: "READING",
    label: "Reading MCQ (Single Answer)",
    headers: ["title", "difficulty", "passage", "question", "option_1", "option_2", "option_3", "option_4", "option_5", "correct_option", ...TAIL],
    example: [
      "Reading MCQ - Climate",
      "MEDIUM",
      "Climate change has been affecting ecosystems worldwide. Rising temperatures have led to...",
      "What is the main topic of this passage?",
      "Effects of climate change on ecosystems",
      "Economic impacts of deforestation",
      "Benefits of renewable energy",
      "Urbanization challenges",
      "",
      "1",
      "reading,environment",
      "false",
      "",
      "",
    ],
    notes: [
      "passage — The reading passage (required)",
      "question — The question text (required)",
      "option_1 to option_5 — Answer choices (minimum 2, option_5 is optional)",
      "correct_option — Number 1–5 indicating the correct answer (required)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "passage", "passage", errors);
      req(row, "question", "question", errors);
      const options = parseOptions(row);
      if (options.length < 2) errors.push("At least 2 options required (option_1, option_2, ...)");
      const ci = parseSingleCorrect(row, options, errors);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "READING", "READING_MCQ_SINGLE", {
          content: { passage: norm(row.passage), question: norm(row.question), options, correctIndex: ci },
        }),
        errors: [],
      };
    },
  },

  READING_MCQ_MULTIPLE: {
    section: "READING",
    label: "Reading MCQ (Multiple Answers)",
    headers: ["title", "difficulty", "passage", "question", "option_1", "option_2", "option_3", "option_4", "option_5", "correct_options", ...TAIL],
    example: [
      "Reading MCQ Multi - Industry",
      "MEDIUM",
      "The industrial revolution transformed society. Coal mining expanded, factories replaced home production...",
      "Which factors contributed to industrialization?",
      "Abundant coal reserves",
      "New farming techniques",
      "Invention of steam engine",
      "Political stability",
      "Improved transport",
      "1,3,5",
      "reading,history",
      "false",
      "",
      "",
    ],
    notes: [
      "correct_options — Comma-separated option numbers (e.g. \"1,3\" means options 1 and 3 are correct)",
      "Minimum 2 correct options should be specified for this question type",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "passage", "passage", errors);
      req(row, "question", "question", errors);
      const options = parseOptions(row);
      if (options.length < 2) errors.push("At least 2 options required");
      const raw = norm(row.correct_options);
      if (!raw) errors.push('"correct_options" is required (e.g. "1,3")');
      const correctIndices = raw.split(",").map((s) => parseInt(s.trim(), 10) - 1).filter((n) => !isNaN(n));
      if (correctIndices.length < 1) errors.push("At least one valid correct option required");
      if (correctIndices.some((ci) => ci < 0 || ci >= options.length))
        errors.push("correct_options references option numbers that don't exist");
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "READING", "READING_MCQ_MULTIPLE", {
          content: { passage: norm(row.passage), question: norm(row.question), options, correctIndices },
        }),
        errors: [],
      };
    },
  },

  REORDER_PARAGRAPHS: {
    section: "READING",
    label: "Reorder Paragraphs",
    headers: ["title", "difficulty", "paragraph_1", "paragraph_2", "paragraph_3", "paragraph_4", "paragraph_5", "correct_order", ...TAIL],
    example: [
      "Reorder - Industrial Revolution",
      "HARD",
      "Coal and steam power revolutionized production methods.",
      "Workers migrated to cities in large numbers seeking employment.",
      "Cottage industries were replaced by centralized factories.",
      "New railways connected towns and enabled mass transport.",
      "",
      "3,1,2,4",
      "reading,history",
      "false",
      "",
      "",
    ],
    notes: [
      "paragraph_1 to paragraph_5 — The scrambled paragraphs (at least 2, up to 5)",
      "correct_order — Comma-separated paragraph numbers in the correct reading sequence",
      "  Example: \"3,1,2,4\" means: paragraph 3 first, paragraph 1 second, paragraph 2 third, paragraph 4 last",
      "Leave paragraph_5 blank if you only have 4 paragraphs",
    ],
    parse(row) {
      const errors: string[] = [];
      const paragraphs = [row.paragraph_1, row.paragraph_2, row.paragraph_3, row.paragraph_4, row.paragraph_5]
        .map((p) => norm(p))
        .filter(Boolean);
      if (paragraphs.length < 2) errors.push("At least 2 paragraphs required");
      const co = norm(row.correct_order);
      if (!co) errors.push('"correct_order" is required (e.g. "2,1,3,4")');
      const nums = co.split(",").map((s) => parseInt(s.trim(), 10));
      if (nums.some(isNaN)) errors.push("correct_order must contain only numbers separated by commas");
      if (nums.length !== paragraphs.length)
        errors.push(`correct_order must have exactly ${paragraphs.length} numbers (one per paragraph)`);
      if (nums.some((n) => n < 1 || n > paragraphs.length))
        errors.push(`correct_order numbers must be between 1 and ${paragraphs.length}`);
      if (new Set(nums).size !== nums.length)
        errors.push("correct_order has duplicate numbers — each paragraph number must appear exactly once");
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "READING", "REORDER_PARAGRAPHS", {
          content: { paragraphs },
          modelAnswer: co,
        }),
        errors: [],
      };
    },
  },

  READING_FILL_BLANKS_DRAG: {
    section: "READING",
    label: "Fill in Blanks (Drag & Drop)",
    headers: ["title", "difficulty", "passage", "blank_answers", ...TAIL],
    example: [
      "Fill Drag - Environment",
      "MEDIUM",
      "The global [blank] is rising due to [blank] emissions from [blank] fuels.",
      "temperature|carbon|fossil",
      "reading,environment",
      "false",
      "",
      "",
    ],
    notes: [
      "passage — Passage with [blank] placeholders where students drag words (required)",
      "blank_answers — Pipe-separated correct answers in order (e.g. \"word1|word2|word3\")",
      "  The number of answers MUST match the number of [blank] placeholders",
      "  Use [blank] exactly (case-insensitive)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "passage", "passage", errors);
      const passage = norm(row.passage);
      const blankCount = (passage.match(/\[blank\]/gi) || []).length;
      if (blankCount === 0 && passage) errors.push('passage must contain [blank] placeholder(s)');
      const answers = norm(row.blank_answers).split("|").map((a) => a.trim()).filter(Boolean);
      if (answers.length === 0) errors.push('"blank_answers" is required (pipe-separated, e.g. "word1|word2")');
      if (blankCount > 0 && answers.length !== blankCount)
        errors.push(`passage has ${blankCount} [blank]s but blank_answers has ${answers.length} values`);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "READING", "READING_FILL_BLANKS_DRAG", {
          content: { passage, blanks: answers },
        }),
        errors: [],
      };
    },
  },

  READING_FILL_BLANKS_DROPDOWN: {
    section: "READING",
    label: "Fill in Blanks (Dropdown)",
    headers: ["title", "difficulty", "passage", "blank_1", "blank_2", "blank_3", "blank_4", "blank_5", ...TAIL],
    example: [
      "Fill Dropdown - Grammar",
      "MEDIUM",
      "She went to the [blank] every morning and [blank] fresh coffee.",
      "market::supermarket::mall::store",
      "bought::ordered::made::drank",
      "",
      "",
      "",
      "reading,grammar",
      "false",
      "",
      "",
    ],
    notes: [
      "passage — Passage with [blank] placeholders (required)",
      "blank_1 to blank_5 — Options for each blank using :: separator",
      "  Format: \"correct_answer::option2::option3::option4\"",
      "  FIRST value is always the correct answer",
      "  Each blank needs at least 2 options (correct + 1 distractor)",
      "  Number of filled blank columns MUST match [blank] count in passage",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "passage", "passage", errors);
      const passage = norm(row.passage);
      const blankCount = (passage.match(/\[blank\]/gi) || []).length;
      if (blankCount === 0 && passage) errors.push("passage must contain [blank] placeholder(s)");
      const blankCols = [row.blank_1, row.blank_2, row.blank_3, row.blank_4, row.blank_5]
        .map((b) => norm(b))
        .filter(Boolean);
      if (blankCols.length !== blankCount)
        errors.push(`passage has ${blankCount} [blank]s but ${blankCols.length} blank column(s) are filled`);
      const blanks: { correctAnswer: string; options: string[] }[] = [];
      blankCols.forEach((bc, i) => {
        const parts = bc.split("::").map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) errors.push(`blank_${i + 1}: needs at least 2 options ("correct::option2")`);
        else blanks.push({ correctAnswer: parts[0], options: parts });
      });
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "READING", "READING_FILL_BLANKS_DROPDOWN", {
          content: { passage, blanks },
        }),
        errors: [],
      };
    },
  },

  SUMMARIZE_SPOKEN_TEXT: {
    section: "LISTENING",
    label: "Summarize Spoken Text",
    headers: ["title", "difficulty", "audio_url", "transcript", ...TAIL],
    example: [
      "Summarize - Economics Lecture",
      "HARD",
      "https://example.com/lecture.mp3",
      "In this lecture, the professor discusses the key drivers of economic growth...",
      "listening,economics",
      "false",
      "",
      "The lecture outlined how investment, innovation, and trade drive economic growth.",
    ],
    notes: [
      "audio_url — URL of the listening audio (required)",
      "transcript — Full spoken transcript",
      "model_answer — A sample summary (recommended for scoring reference)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "LISTENING", "SUMMARIZE_SPOKEN_TEXT", {
          content: { transcript: norm(row.transcript) },
        }),
        errors: [],
      };
    },
  },

  LISTENING_MCQ_SINGLE: {
    section: "LISTENING",
    label: "Listening MCQ (Single Answer)",
    headers: ["title", "difficulty", "audio_url", "transcript", "question", "option_1", "option_2", "option_3", "option_4", "option_5", "correct_option", ...TAIL],
    example: [
      "Listening MCQ - Policy",
      "MEDIUM",
      "https://example.com/audio.mp3",
      "The speaker explains the new health policy introduced last year...",
      "What is the main focus of the talk?",
      "Healthcare reform",
      "Tax policy changes",
      "Education funding",
      "Trade agreements",
      "",
      "1",
      "listening,policy",
      "false",
      "",
      "",
    ],
    notes: [
      "audio_url — URL of the audio (required)",
      "question — The question to answer after listening (required)",
      "option_1 to option_5 — Answer choices (minimum 2)",
      "correct_option — Number 1–5 of the correct answer (required)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      req(row, "question", "question", errors);
      const options = parseOptions(row);
      if (options.length < 2) errors.push("At least 2 options required");
      const ci = parseSingleCorrect(row, options, errors);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "LISTENING", "LISTENING_MCQ_SINGLE", {
          content: { transcript: norm(row.transcript), question: norm(row.question), options, correctIndex: ci },
        }),
        errors: [],
      };
    },
  },

  LISTENING_MCQ_MULTIPLE: {
    section: "LISTENING",
    label: "Listening MCQ (Multiple Answers)",
    headers: ["title", "difficulty", "audio_url", "transcript", "question", "option_1", "option_2", "option_3", "option_4", "option_5", "correct_options", ...TAIL],
    example: [
      "Listening MCQ Multi - Science",
      "MEDIUM",
      "https://example.com/audio.mp3",
      "The researcher discusses multiple benefits of exercise...",
      "Which benefits of exercise are mentioned?",
      "Improved cardiovascular health",
      "Better sleep quality",
      "Increased income",
      "Stronger bones",
      "Enhanced mood",
      "1,2,4,5",
      "listening,health",
      "false",
      "",
      "",
    ],
    notes: [
      "correct_options — Comma-separated numbers (e.g. \"1,2,4\")",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      req(row, "question", "question", errors);
      const options = parseOptions(row);
      if (options.length < 2) errors.push("At least 2 options required");
      const raw = norm(row.correct_options);
      if (!raw) errors.push('"correct_options" is required (e.g. "1,3")');
      const correctIndices = raw.split(",").map((s) => parseInt(s.trim(), 10) - 1).filter((n) => !isNaN(n));
      if (correctIndices.length < 1) errors.push("At least one valid correct option required");
      if (correctIndices.some((ci) => ci < 0 || ci >= options.length))
        errors.push("correct_options references option numbers that don't exist");
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "LISTENING", "LISTENING_MCQ_MULTIPLE", {
          content: { transcript: norm(row.transcript), question: norm(row.question), options, correctIndices },
        }),
        errors: [],
      };
    },
  },

  LISTENING_FILL_BLANKS: {
    section: "LISTENING",
    label: "Listening Fill in Blanks",
    headers: ["title", "difficulty", "audio_url", "transcript", "blank_1", "blank_2", "blank_3", "blank_4", "blank_5", ...TAIL],
    example: [
      "Fill Blanks - Environment",
      "MEDIUM",
      "https://example.com/audio.mp3",
      "The temperature has [blank] by two [blank] over the last century.",
      "risen::fallen::decreased::increased",
      "degrees::percent::meters::years",
      "",
      "",
      "",
      "listening,environment",
      "false",
      "",
      "",
    ],
    notes: [
      "transcript — What the student hears, with [blank] for missing words (required)",
      "audio_url — URL of the audio (required)",
      "blank_1 to blank_5 — Options for each blank: \"correct::option2::option3\"",
      "  FIRST value after :: is always the correct answer",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      const transcript = norm(row.transcript);
      if (!transcript) errors.push('"transcript" is required (with [blank] placeholders)');
      const blankCount = (transcript.match(/\[blank\]/gi) || []).length;
      if (blankCount === 0 && transcript) errors.push("transcript must contain at least one [blank] placeholder");
      const blankCols = [row.blank_1, row.blank_2, row.blank_3, row.blank_4, row.blank_5]
        .map((b) => norm(b))
        .filter(Boolean);
      if (blankCols.length !== blankCount)
        errors.push(`transcript has ${blankCount} [blank]s but ${blankCols.length} blank column(s) filled`);
      const blanks: { correctAnswer: string; options: string[] }[] = [];
      blankCols.forEach((bc, i) => {
        const parts = bc.split("::").map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) errors.push(`blank_${i + 1}: needs at least 2 options ("correct::option2")`);
        else blanks.push({ correctAnswer: parts[0], options: parts });
      });
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "LISTENING", "LISTENING_FILL_BLANKS", {
          content: { transcript, blanks },
        }),
        errors: [],
      };
    },
  },

  HIGHLIGHT_CORRECT_SUMMARY: {
    section: "LISTENING",
    label: "Highlight Correct Summary",
    headers: ["title", "difficulty", "audio_url", "transcript", "option_1", "option_2", "option_3", "option_4", "correct_option", ...TAIL],
    example: [
      "Summary - Technology Talk",
      "MEDIUM",
      "https://example.com/audio.mp3",
      "This talk covers how computing evolved from mechanical to digital systems...",
      "Technology has changed how we communicate globally.",
      "Computing evolved from mechanical to electronic and then digital systems.",
      "The internet was invented in the 1990s by Tim Berners-Lee.",
      "Software development is now more important than hardware engineering.",
      "2",
      "listening,technology",
      "false",
      "",
      "",
    ],
    notes: [
      "option_1 to option_4 — Summary paragraph options (at least 2, max 4)",
      "correct_option — Number 1–4 of the correct summary (required)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      const options = [row.option_1, row.option_2, row.option_3, row.option_4].map((o) => norm(o)).filter(Boolean);
      if (options.length < 2) errors.push("At least 2 summary options required (option_1, option_2, ...)");
      const ci = parseInt(norm(row.correct_option), 10) - 1;
      if (isNaN(ci) || ci < 0 || ci >= options.length)
        errors.push(`correct_option must be a number 1–${options.length}`);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "LISTENING", "HIGHLIGHT_CORRECT_SUMMARY", {
          content: { transcript: norm(row.transcript), options, correctIndex: ci },
        }),
        errors: [],
      };
    },
  },

  SELECT_MISSING_WORD: {
    section: "LISTENING",
    label: "Select Missing Word",
    headers: ["title", "difficulty", "audio_url", "transcript", "option_1", "option_2", "option_3", "option_4", "correct_option", ...TAIL],
    example: [
      "Missing Word - Research",
      "MEDIUM",
      "https://example.com/audio.mp3",
      "The experiment produced remarkable [blank]",
      "results",
      "failures",
      "problems",
      "setbacks",
      "1",
      "listening,science",
      "false",
      "",
      "",
    ],
    notes: [
      "transcript — The sentence/text ending with [blank] for the missing word",
      "option_1 to option_4 — Word choices to complete the sentence",
      "correct_option — Number 1–4 of the correct word (required)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      const options = [row.option_1, row.option_2, row.option_3, row.option_4].map((o) => norm(o)).filter(Boolean);
      if (options.length < 2) errors.push("At least 2 options required");
      const ci = parseInt(norm(row.correct_option), 10) - 1;
      if (isNaN(ci) || ci < 0 || ci >= options.length)
        errors.push(`correct_option must be a number 1–${options.length}`);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "LISTENING", "SELECT_MISSING_WORD", {
          content: { transcript: norm(row.transcript), options, correctIndex: ci },
        }),
        errors: [],
      };
    },
  },

  HIGHLIGHT_INCORRECT_WORDS: {
    section: "LISTENING",
    label: "Highlight Incorrect Words",
    headers: ["title", "difficulty", "audio_url", "transcript", "passage", "incorrect_words", ...TAIL],
    example: [
      "Incorrect Words - Policy",
      "MEDIUM",
      "https://example.com/audio.mp3",
      "The government announced new tax policies yesterday.",
      "The government revealed new spending policies recently.",
      "revealed|spending|recently",
      "listening,policy",
      "false",
      "",
      "",
    ],
    notes: [
      "transcript — What is actually said in the audio",
      "passage — The text displayed to students (contains some wrong words)",
      "incorrect_words — Pipe-separated list of words in passage that differ from audio",
      "  Each word must appear exactly in the passage",
      "  Example: \"revealed|spending|recently\"",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      req(row, "passage", "passage", errors);
      const incorrectWords = norm(row.incorrect_words).split("|").map((w) => w.trim()).filter(Boolean);
      if (incorrectWords.length === 0) errors.push('"incorrect_words" is required (pipe-separated, e.g. "word1|word2")');
      const passage = norm(row.passage);
      if (passage) {
        incorrectWords.forEach((w) => {
          if (!passage.toLowerCase().includes(w.toLowerCase()))
            errors.push(`Incorrect word "${w}" not found in passage`);
        });
      }
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "LISTENING", "HIGHLIGHT_INCORRECT_WORDS", {
          content: { transcript: norm(row.transcript), passage, incorrectWords },
        }),
        errors: [],
      };
    },
  },

  WRITE_FROM_DICTATION: {
    section: "LISTENING",
    label: "Write from Dictation",
    headers: ["title", "difficulty", "audio_url", "transcript", "correct_text", ...TAIL],
    example: [
      "Dictation - Short Sentence",
      "EASY",
      "https://example.com/dictation.mp3",
      "The quick brown fox jumps over the lazy dog.",
      "The quick brown fox jumps over the lazy dog.",
      "listening,dictation",
      "false",
      "",
      "",
    ],
    notes: [
      "audio_url — URL of the dictation audio (required)",
      "transcript — What is spoken (can be the same as correct_text)",
      "correct_text — The exact sentence students must type (required, used for scoring)",
    ],
    parse(row) {
      const errors: string[] = [];
      req(row, "audio_url", "audio_url", errors);
      req(row, "correct_text", "correct_text", errors);
      if (errors.length) return { question: null, errors };
      return {
        question: baseQ(row, "LISTENING", "WRITE_FROM_DICTATION", {
          content: { transcript: norm(row.transcript || row.correct_text) },
          modelAnswer: norm(row.correct_text),
        }),
        errors: [],
      };
    },
  },
};

// ─── CSV Utilities ────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  // Strip UTF-8 BOM if present
  const clean = text.replace(/^﻿/, "");
  const lines = clean.split(/\r?\n/);
  const nonEmpty = lines.filter((l) => l.trim() && !l.trim().startsWith("#"));
  if (nonEmpty.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === "," && !inQ) {
        result.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseRow(nonEmpty[0]).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < nonEmpty.length; i++) {
    const vals = parseRow(nonEmpty[i]);
    // Skip rows where all values are empty
    if (vals.every((v) => !v.trim())) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
    rows.push(row);
  }
  return rows;
}

function escapeCSV(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n") || v.includes("|") || v.includes("::")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function generateTemplate(type: string): string {
  const cfg = T[type];
  if (!cfg) return "";
  const lines = [cfg.headers.join(","), cfg.example.map(escapeCSV).join(",")];
  return lines.join("\n");
}

function downloadTemplate(type: string) {
  const csv = generateTemplate(type);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template_${type.toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function validateRows(csvText: string, type: string): RowResult[] {
  const rows = parseCSV(csvText);
  const cfg = T[type];
  if (!cfg) return [];

  return rows.map((row, i) => {
    // Warn if section/type columns are present but wrong
    const extraErrors: string[] = [];
    if (row.type && row.type.trim().toUpperCase() !== type) {
      extraErrors.push(`"type" column value "${row.type}" does not match selected type "${type}"`);
    }
    if (row.section && row.section.trim().toUpperCase() !== cfg.section) {
      extraErrors.push(`"section" column value "${row.section}" does not match expected "${cfg.section}"`);
    }

    const { question, errors } = cfg.parse(row);
    const allErrors = [...extraErrors, ...errors];
    return {
      rowNum: i + 2, // 1-indexed, +1 for header row
      rawTitle: norm(row.title) || `(row ${i + 2})`,
      errors: allErrors,
      question: allErrors.length === 0 ? question : null,
    };
  });
}

// ─── Section Config ───────────────────────────────────────────────────────────

const SECTIONS = [
  { key: "SPEAKING", icon: Mic, color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-200 dark:border-teal-800" },
  { key: "WRITING", icon: PenTool, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-800" },
  { key: "READING", icon: BookOpen, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-800" },
  { key: "LISTENING", icon: Headphones, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/40", border: "border-orange-200 dark:border-orange-800" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

interface BulkUploadModalProps {
  onClose: () => void;
  onUploaded: () => void;
}

export function BulkUploadModal({ onClose, onUploaded }: BulkUploadModalProps) {
  const [step, setStep] = useState<"type" | "upload" | "done">("type");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showNotes, setShowNotes] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rowResults, setRowResults] = useState<RowResult[]>([]);
  const [filter, setFilter] = useState<"all" | "valid" | "invalid">("all");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ count: number; error?: string } | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const cfg = selectedType ? T[selectedType] : null;
  const validRows = rowResults.filter((r) => r.question !== null);
  const invalidRows = rowResults.filter((r) => r.question === null);
  const displayRows = filter === "valid" ? validRows : filter === "invalid" ? invalidRows : rowResults;

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".csv")) {
        alert("Please upload a .csv file. Export your spreadsheet as CSV first.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text.trim()) { alert("The file is empty."); return; }
        const results = validateRows(text, selectedType);
        if (results.length === 0) {
          alert("No data rows found. Make sure the file has a header row and at least one data row.");
          return;
        }
        setRowResults(results);
        setFilter("all");
        setExpandedRows(new Set());
        setStep("upload");
      };
      reader.readAsText(file, "utf-8");
    },
    [selectedType]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleUpload = async () => {
    const toUpload = validRows.map((r) => r.question).filter(Boolean);
    if (toUpload.length === 0) return;
    setUploading(true);
    try {
      const res = await fetch("/api/questions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: toUpload }),
      });
      const data = await res.json();
      if (data.success) {
        setUploadResult({ count: data.data.count });
        setStep("done");
        onUploaded();
      } else {
        setUploadResult({ count: 0, error: data.error || "Upload failed" });
        setStep("done");
      }
    } catch {
      setUploadResult({ count: 0, error: "Network error. Please try again." });
      setStep("done");
    } finally {
      setUploading(false);
    }
  };

  const toggleRow = (rowNum: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNum)) next.delete(rowNum);
      else next.add(rowNum);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Bulk Upload Questions</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {step === "type" && "Step 1 of 2 — Select question type"}
              {step === "upload" && `Step 2 of 2 — Review & upload (${validRows.length} valid, ${invalidRows.length} invalid)`}
              {step === "done" && "Complete"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="shrink-0 px-6 pt-3">
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: step === "type" ? "50%" : step === "upload" ? "100%" : "100%" }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* ── Step 1: Type Selection ── */}
          {step === "type" && (
            <div className="space-y-5">
              {SECTIONS.map((sec) => {
                const SectionIcon = sec.icon;
                const types = Object.entries(T).filter(([, cfg]) => cfg.section === sec.key);
                return (
                  <div key={sec.key}>
                    <div className={cn("mb-2 flex items-center gap-2 rounded-lg border px-3 py-2", sec.bg, sec.border)}>
                      <SectionIcon className={cn("h-4 w-4", sec.color)} />
                      <span className={cn("text-sm font-semibold uppercase tracking-wide", sec.color)}>
                        {sec.key}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {types.map(([typeKey, typeCfg]) => (
                        <button
                          key={typeKey}
                          onClick={() => setSelectedType(typeKey)}
                          className={cn(
                            "rounded-xl border px-3 py-2.5 text-left text-sm transition",
                            selectedType === typeKey
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          )}
                        >
                          <span className="font-medium leading-tight">{typeCfg.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Format guide */}
              {cfg && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 dark:border-indigo-900 dark:bg-indigo-950/30">
                  <button
                    onClick={() => setShowNotes((v) => !v)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      <FileText className="h-4 w-4" />
                      Format Guide — {cfg.label}
                    </span>
                    {showNotes ? (
                      <ChevronUp className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-indigo-400" />
                    )}
                  </button>
                  {showNotes && (
                    <div className="border-t border-indigo-100 px-4 pb-4 pt-3 dark:border-indigo-900">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
                        CSV Columns
                      </p>
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {cfg.headers.map((h) => (
                          <code
                            key={h}
                            className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-mono text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
                          >
                            {h}
                          </code>
                        ))}
                      </div>
                      <ul className="space-y-1">
                        {cfg.notes.map((note, i) => (
                          <li key={i} className="text-xs text-gray-600 dark:text-slate-400">
                            {note.startsWith("  ") ? (
                              <span className="ml-3 text-gray-500 dark:text-slate-500">{note.trim()}</span>
                            ) : (
                              note
                            )}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 dark:bg-amber-950/30 dark:border-amber-800">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                          Special separators
                        </p>
                        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                          Use <code className="font-mono">|</code> to separate items in a list (e.g. blank_answers)
                        </p>
                        <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                          Use <code className="font-mono">::</code> to separate options within a blank (first = correct)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Drag & drop upload zone */}
              {cfg && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition",
                    isDragging
                      ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50 dark:border-slate-600 dark:hover:border-indigo-600 dark:hover:bg-slate-800/60"
                  )}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-gray-300 dark:text-slate-500" />
                  <div>
                    <p className="font-medium text-gray-700 dark:text-slate-300">
                      Drop your CSV file here, or click to browse
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                      Export from Excel or Google Sheets as .csv
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Validate & Upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              {/* Summary chips */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                  {rowResults.length} rows parsed
                </span>
                <span className="flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  {validRows.length} valid
                </span>
                {invalidRows.length > 0 && (
                  <span className="flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    <XCircle className="h-4 w-4" />
                    {invalidRows.length} invalid
                  </span>
                )}
                <button
                  onClick={() => { setRowResults([]); setStep("type"); }}
                  className="ml-auto text-sm text-indigo-600 underline dark:text-indigo-400"
                >
                  Upload different file
                </button>
              </div>

              {/* Filter tabs */}
              <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-slate-700">
                {(["all", "valid", "invalid"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition",
                      filter === f
                        ? "bg-white text-gray-900 shadow-sm dark:bg-slate-600 dark:text-slate-100"
                        : "text-gray-500 dark:text-slate-400"
                    )}
                  >
                    {f} {f === "all" ? `(${rowResults.length})` : f === "valid" ? `(${validRows.length})` : `(${invalidRows.length})`}
                  </button>
                ))}
              </div>

              {/* Rows table */}
              <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 dark:divide-slate-700 dark:border-slate-700">
                {displayRows.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400 dark:text-slate-500">No rows to show</p>
                ) : (
                  displayRows.map((r) => {
                    const isExpanded = expandedRows.has(r.rowNum);
                    const isValid = r.question !== null;
                    return (
                      <div key={r.rowNum}>
                        <button
                          className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-800/60"
                          onClick={() => !isValid && toggleRow(r.rowNum)}
                        >
                          {isValid ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                          )}
                          <span className="shrink-0 text-xs font-mono text-gray-400 dark:text-slate-500">
                            Row {r.rowNum}
                          </span>
                          <span className="flex-1 truncate text-sm text-gray-700 dark:text-slate-300">
                            {r.rawTitle}
                          </span>
                          {!isValid && (
                            <span className="shrink-0 text-xs text-red-500">
                              {r.errors.length} error{r.errors.length !== 1 ? "s" : ""}
                              {isExpanded ? " ▲" : " ▼"}
                            </span>
                          )}
                        </button>
                        {!isValid && isExpanded && (
                          <ul className="border-t border-red-100 bg-red-50/60 px-4 pb-3 pt-2 dark:border-red-900/40 dark:bg-red-950/20">
                            {r.errors.map((e, i) => (
                              <li key={i} className="flex items-start gap-2 py-0.5 text-xs text-red-700 dark:text-red-400">
                                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                {e}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {invalidRows.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                  <strong>{invalidRows.length}</strong> invalid row{invalidRows.length !== 1 ? "s" : ""} will be skipped.
                  Click errors above to see what needs fixing, then re-upload the corrected file.
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {uploadResult?.error ? (
                <>
                  <XCircle className="h-14 w-14 text-red-400" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Upload Failed</h3>
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadResult.error}</p>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-14 w-14 text-green-500" />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-slate-100">
                    {uploadResult?.count} question{uploadResult?.count !== 1 ? "s" : ""} uploaded
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                    Questions are now available in the question bank.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 px-6 py-4 dark:border-slate-700">
          {step === "type" && (
            <div className="flex items-center justify-between gap-3">
              {selectedType && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => downloadTemplate(selectedType)}
                >
                  <Download className="h-4 w-4" />
                  Download Template
                </Button>
              )}
              <div className="flex flex-1 justify-end">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === "upload" && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => { setRowResults([]); setStep("type"); }}>
                ← Back
              </Button>
              <Button
                onClick={handleUpload}
                disabled={validRows.length === 0 || uploading}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Uploading…
                  </span>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload {validRows.length} Valid Question{validRows.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="flex justify-end gap-3">
              {!uploadResult?.error && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep("type");
                    setSelectedType("");
                    setRowResults([]);
                    setUploadResult(null);
                    setShowNotes(false);
                  }}
                >
                  Upload More
                </Button>
              )}
              <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
