"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AudioRecorder } from "@/components/practice/audio-recorder";
import { AudioPlayerCustom } from "@/components/practice/audio-player-custom";
import {
  CheckCircle2, XCircle, Loader2, Volume2,
  BookOpen as TemplateIcon, GripVertical, X,
} from "lucide-react";
import { WRITING_TEMPLATES, SPEAKING_TEMPLATES } from "@/lib/templates";
import { SKILL_CONTRIBUTIONS, SKILL_KEYS, type SkillKey } from "@/lib/pte-scoring";

// Normalize a fill-in-the-blank answer for fair matching: case-insensitive,
// trimmed, internal whitespace collapsed, surrounding punctuation ignored — so
// "Run.", " run " and "run" all match "run".
function normAns(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface QuestionData {
  id: string;
  type: string;
  title: string;
  difficulty: string;
  content: any;
  explanation: string | null;
  modelAnswer: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  isPrediction: boolean;
  marks?: number;
}

export interface ScoreResult {
  marksEarned: number;
  marksTotal: number;
  correct: number;
  total: number;
  mistakes: Array<{ position: number; yourAnswer: string; correctAnswer: string }>;
  pending?: boolean;
  message?: string;
  aiScores?: Record<string, number>; // detailed breakdown from AI: pronunciation/fluency/content etc.
  transcription?: string;
}

// Speak a single word aloud using an Indian English voice (where available)
function speakWordIndianAccent(word: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;

  const speak = () => {
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = "en-IN";
    utter.rate = 0.85;
    const voices = synth.getVoices();
    const indianVoice =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find((v) => v.lang?.toLowerCase() === "en-in") ||
      voices.find((v) => v.lang?.startsWith("en"));
    if (indianVoice) utter.voice = indianVoice;
    synth.cancel();
    synth.speak(utter);
  };

  if (synth.getVoices().length === 0) {
    synth.onvoiceschanged = speak;
  } else {
    speak();
  }
}

// Renders text with each word individually clickable to hear its pronunciation.
// Used for Read Aloud passages in practice mode (not mock tests).
function ClickableWords({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <div className={className}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return part;
        const cleanWord = part.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, "");
        if (!cleanWord) return part;
        return (
          <span
            key={i}
            onClick={() => speakWordIndianAccent(cleanWord)}
            className="cursor-pointer rounded transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-300"
            title="Click to hear pronunciation"
          >
            {part}
          </span>
        );
      })}
    </div>
  );
}

// Popover showing a word's English + Hindi meaning and an example sentence,
// fetched from /api/vocabulary/lookup. Positioned near the clicked word.
function WordMeaningPopover({ word, x, y, onClose }: { word: string; x: number; y: number; onClose: () => void }) {
  const [data, setData] = useState<{ meaning: string; meaningHi: string | null; example: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    setData(null);
    fetch(`/api/vocabulary/lookup?word=${encodeURIComponent(word)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.success) setData(d.data);
        else setError(true);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [word]);

  const popoverWidth = 288; // matches w-72
  const left = typeof window !== "undefined"
    ? Math.min(Math.max(x, 8), window.innerWidth - popoverWidth - 8)
    : x;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-72 max-w-[85vw] rounded-lg border border-indigo-200 bg-white p-3 text-sm shadow-xl dark:border-indigo-800 dark:bg-slate-800"
        style={{ left, top: y }}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <p className="font-semibold capitalize text-indigo-700 dark:text-indigo-300">{word}</p>
          <button onClick={onClose} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
            <X className="h-4 w-4" />
          </button>
        </div>
        {loading && <p className="text-gray-400 dark:text-slate-500">Loading meaning…</p>}
        {error && <p className="text-red-500 dark:text-red-400">Couldn&apos;t load the meaning. Please try again.</p>}
        {data && (
          <div className="space-y-1.5 text-gray-700 dark:text-slate-200">
            <p><span className="font-medium text-gray-500 dark:text-slate-400">English: </span>{data.meaning}</p>
            {data.meaningHi && <p><span className="font-medium text-gray-500 dark:text-slate-400">Hindi: </span>{data.meaningHi}</p>}
            <p className="italic text-gray-500 dark:text-slate-400">e.g., &ldquo;{data.example}&rdquo;</p>
          </div>
        )}
      </div>
    </>
  );
}

// Renders text with each word individually clickable to show its meaning
// (English + Hindi + example) in a popover. Used for Reading passages in
// practice mode (not mock tests).
function ClickableMeaningText({ text, className }: { text: string; className?: string }) {
  const [popover, setPopover] = useState<{ word: string; x: number; y: number } | null>(null);
  const parts = text.split(/(\s+)/);
  return (
    <div className={className}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part)) return part;
        const cleanWord = part.replace(/^[^a-zA-Z'-]+|[^a-zA-Z'-]+$/g, "");
        if (!cleanWord) return part;
        return (
          <span
            key={i}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setPopover({ word: cleanWord, x: rect.left, y: rect.bottom + 4 });
            }}
            className="cursor-pointer rounded transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:hover:bg-indigo-900/50 dark:hover:text-indigo-300"
            title="Click for meaning"
          >
            {part}
          </span>
        );
      })}
      {popover && (
        <WordMeaningPopover word={popover.word} x={popover.x} y={popover.y} onClose={() => setPopover(null)} />
      )}
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

// ==========================================================================
// ==========================================================================
// Drag-and-drop reorder component for REORDER_PARAGRAPHS
// ==========================================================================
function ReorderDnD({
  paragraphs, order, onReorder, submitted, correctOrder, showFeedback = true, isMockTest = false,
}: {
  paragraphs: string[];
  order: number[];
  onReorder: (newOrder: number[]) => void;
  submitted: boolean;
  correctOrder: number[];
  showFeedback?: boolean;
  isMockTest?: boolean;
}) {
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragIdxRef = useRef<number | null>(null);

  const handleDragStart = (idx: number) => { dragIdxRef.current = idx; };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const dragIdx = dragIdxRef.current;
    if (dragIdx === null || dragIdx === dropIdx) { setDragOverIdx(null); return; }
    const newOrder = [...order];
    const [removed] = newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, removed);
    onReorder(newOrder);
    dragIdxRef.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => { dragIdxRef.current = null; setDragOverIdx(null); };

  const moveUp = (idx: number) => {
    if (idx <= 0) return;
    const newOrder = [...order];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    onReorder(newOrder);
  };

  const moveDown = (idx: number) => {
    if (idx >= order.length - 1) return;
    const newOrder = [...order];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    onReorder(newOrder);
  };

  return (
    <div className="space-y-2">
      {order.map((paraIdx, position) => {
        const isCorrect = submitted && showFeedback && correctOrder[position] === paraIdx;
        const isDragOver = !submitted && dragOverIdx === position;
        const isDragging = !submitted && dragIdxRef.current === position;

        return (
          <div
            key={`${paraIdx}-${position}`}
            draggable={!submitted}
            onDragStart={() => handleDragStart(position)}
            onDragOver={(e) => handleDragOver(e, position)}
            onDrop={(e) => handleDrop(e, position)}
            onDragEnd={handleDragEnd}
            className={`flex items-start gap-3 rounded-lg border p-3 transition-all select-none ${
              submitted
                ? showFeedback
                  ? isCorrect
                    ? "border-green-600 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/60 dark:text-green-200"
                    : "border-red-500 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/60 dark:text-red-200"
                  : "border-gray-200 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                : isDragOver
                  ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/40 shadow-md"
                  : isDragging
                    ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-700 dark:bg-slate-800 opacity-50"
                    : "border-gray-200 bg-white text-gray-700 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 cursor-grab hover:border-gray-300 dark:hover:border-slate-500 dark:hover:bg-slate-700"
            }`}
          >
            {!submitted && (
              <GripVertical className="mt-0.5 h-5 w-5 shrink-0 text-gray-300 dark:text-slate-500" />
            )}
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              submitted && showFeedback
                ? isCorrect
                  ? "bg-green-600 text-white dark:bg-green-700"
                  : "bg-red-500 text-white dark:bg-red-700"
                : "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-200"
            }`}>
              {paraIdx + 1}
            </span>
            {isMockTest ? (
              <p className="flex-1 text-sm">{paragraphs[paraIdx]}</p>
            ) : (
              <ClickableMeaningText text={paragraphs[paraIdx]} className="flex-1 text-sm" />
            )}
            {/* Arrow buttons shown only on mobile where drag isn't reliable */}
            {!submitted && (
              <div className="flex flex-col gap-1 sm:hidden">
                <button type="button" aria-label="Move paragraph up" disabled={position === 0} onClick={() => moveUp(position)} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700">▲</button>
                <button type="button" aria-label="Move paragraph down" disabled={position === order.length - 1} onClick={() => moveDown(position)} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:text-slate-400 dark:hover:bg-slate-700">▼</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Question Renderer — renders different UI based on question type
// ==========================================================================
// ─── Per-question-type instructions shown to students ─────────────────────────

const QUESTION_INSTRUCTIONS: Record<string, string> = {
  WRITE_ESSAY:
    "Read the prompt carefully and write your essay in 200–300 words. Present a clear argument with well-structured supporting points.",
  SUMMARIZE_WRITTEN_TEXT:
    "Read the passage below. In one sentence of 5–75 words, write a summary that covers the main point of the passage.",
  READING_MCQ_SINGLE:
    "Read the passage below and select the single best answer to the question.",
  READING_MCQ_MULTIPLE:
    "Read the passage below. There is more than one correct answer — select all options that apply.",
  REORDER_PARAGRAPHS:
    "The text boxes below are in random order. Drag them to arrange them into a logical and coherent sequence.",
  READING_FILL_BLANKS_DRAG:
    "Read the passage below. Drag words from the word bank to fill in the blanks.",
  READING_FILL_BLANKS_DROPDOWN:
    "Read the passage below. For each blank, select the most appropriate word from the dropdown list.",
  SUMMARIZE_SPOKEN_TEXT:
    "You will hear a recording. After listening, write a 50–70 word summary covering the main points in your own words.",
  HIGHLIGHT_CORRECT_SUMMARY:
    "You will hear a recording. Then select the paragraph below that best summarises what you heard.",
  HIGHLIGHT_INCORRECT_WORDS:
    "You will hear a recording. As you listen, click on every word in the text that differs from what the speaker says.",
  SELECT_MISSING_WORD:
    "You will hear a recording in which the last word or phrase is replaced by a beep. Select the option that best completes the recording.",
  LISTENING_MCQ_SINGLE:
    "You will hear a recording. Listen carefully and select the single best answer to the question.",
  LISTENING_MCQ_MULTIPLE:
    "You will hear a recording. There is more than one correct answer — select all options that apply.",
  LISTENING_FILL_BLANKS:
    "You will hear a recording. Type the missing words in the blanks as you listen.",
  WRITE_FROM_DICTATION:
    "You will hear a sentence. Listen carefully and type the sentence exactly as you hear it, including correct spelling and punctuation.",
};

function QuestionInstruction({ type }: { type: string }) {
  const text = QUESTION_INSTRUCTIONS[type];
  if (!text) return null;
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
      <span className="mt-0.5 shrink-0 text-base">📋</span>
      <p>{text}</p>
    </div>
  );
}

export function QuestionRenderer({
  question, submitted, showAnswer = false, showFeedback = true, onSubmit, onResponseChange, initialResponse, playOnce = false, submitRef, allowCopyPaste = false, isMockTest = false, onScoringChange,
}: {
  question: QuestionData;
  submitted: boolean;
  showAnswer?: boolean;
  showFeedback?: boolean;
  onSubmit: (response: any) => void;
  onResponseChange?: (response: any) => void;
  initialResponse?: any;
  score?: any;
  playOnce?: boolean;
  submitRef?: React.MutableRefObject<(() => void) | null>;
  allowCopyPaste?: boolean;
  isMockTest?: boolean;
  onScoringChange?: (scoring: boolean) => void;
}) {
  const [response, setResponse] = useState<any>(() => {
    // Pre-fill with a previously saved answer (review mode)
    if (initialResponse !== undefined && initialResponse !== null) return initialResponse;
    if (question?.type === "REORDER_PARAGRAPHS") {
      const pars: string[] = (question?.content as any)?.paragraphs || [];
      if (pars.length <= 1) return null;
      const indices = pars.map((_: string, i: number) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      return indices;
    }
    return null;
  });
  const content = question?.content as any;

  // Fire onResponseChange whenever the response state changes (used by mock test auto-save)
  useEffect(() => {
    if (response !== null && response !== undefined) {
      onResponseChange?.(response);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  // Internal submit fn — each type branch sets this before returning.
  // The parent can trigger it via submitRef (e.g. on Next click).
  const internalSubmitFn = useRef<(() => void) | null>(null);

  // Block copy/paste/cut for non-super-admin users on writing inputs
  const blockCP = !allowCopyPaste
    ? (e: React.ClipboardEvent) => e.preventDefault()
    : undefined;

  if (!question || !content) return null;

  const type = question.type;
  const totalMarks = question.marks && question.marks > 0 ? question.marks : 1;

  // Keep parent's submitRef in sync. Set before any early-return branches.
  if (submitRef) submitRef.current = !submitted ? () => internalSubmitFn.current?.() : null;

  // ---- READ ALOUD ----
  if (type === "READ_ALOUD") {
    return (
      <SpeakingQuestion
        instructionText="Read the text above aloud, clearly and naturally."
        prepTime={0}
        maxDuration={40}
        mountAutoStart={true}
        autoStartDelay={35}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        playOnce={playOnce}
        expectedText={content.text || ""}
      >
        {isMockTest ? (
          <div className="rounded-lg bg-amber-50 dark:bg-slate-700/50 p-4 text-lg leading-relaxed text-gray-800 dark:text-slate-100">
            {content.text}
          </div>
        ) : (
          <ClickableWords
            text={content.text || ""}
            className="rounded-lg bg-amber-50 dark:bg-slate-700/50 p-4 text-lg leading-relaxed text-gray-800 dark:text-slate-100"
          />
        )}
      </SpeakingQuestion>
    );
  }

  // ---- REPEAT SENTENCE ----
  if (type === "REPEAT_SENTENCE") {
    return (
      <SpeakingQuestion
        instructionText="Listen to the sentence, then repeat it exactly as you heard it."
        prepTime={0}
        maxDuration={15}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        playOnce={playOnce}
        expectedText={content.text || ""}
        audioSrc={content.audioUrl || question.audioUrl || ""}
        audioLabel="Listen carefully"
        autoStartDelay={3}
      />
    );
  }

  // ---- DESCRIBE IMAGE ----
  if (type === "DESCRIBE_IMAGE") {
    const imgSrc = content.imageUrl || question.imageUrl;
    return (
      <SpeakingQuestion
        instructionText="Look at the image carefully and describe it in detail. Mention the main elements, trends, or key data."
        prepTime={0}
        maxDuration={40}
        mountAutoStart={true}
        autoStartDelay={25}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        playOnce={playOnce}
        expectedText={content.text || ""}
      >
        {imgSrc ? (
          <div className="relative mx-auto h-80 w-full">
            <Image
              src={imgSrc}
              alt="Describe this image"
              fill
              className="rounded-lg border object-contain"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <p className="text-sm text-gray-400">No image uploaded for this question. Ask your admin to add one.</p>
          </div>
        )}
        {/* Reference points shown only after submission so student isn't coached during practice */}
        {submitted && showFeedback && content.text && (
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <span className="font-medium">Reference points: </span>{content.text}
          </div>
        )}
      </SpeakingQuestion>
    );
  }

  // ---- RETELL LECTURE ----
  if (type === "RETELL_LECTURE") {
    return (
      <SpeakingQuestion
        instructionText="Listen to the lecture, then retell the main points in your own words."
        prepTime={0}
        maxDuration={40}
        autoStartDelay={5}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        playOnce={playOnce}
        expectedText={content.text || ""}
        audioSrc={content.audioUrl || question.audioUrl || ""}
        audioLabel="Listen to the lecture"
      />
    );
  }

  // ---- ANSWER SHORT QUESTION ----
  if (type === "ANSWER_SHORT_QUESTION") {
    return (
      <SpeakingQuestion
        instructionText="Answer the question in one or two words."
        prepTime={0}
        maxDuration={10}
        autoStartDelay={2}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        playOnce={playOnce}
        expectedText={content.correctText || content.text || ""}
        audioSrc={content.audioUrl || question.audioUrl || ""}
        audioLabel="Listen to the question"
      >
        {content.text && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-slate-700/50 p-4 text-base font-medium text-gray-800 dark:text-slate-100">
            {content.text}
          </div>
        )}
        {submitted && showFeedback && content.correctText && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-xs font-medium text-green-700">Correct answer:</p>
            <p className="text-sm text-green-900">{content.correctText}</p>
          </div>
        )}
      </SpeakingQuestion>
    );
  }

  // ---- RESPOND TO SITUATION ----
  if (type === "RESPOND_TO_SITUATION") {
    return (
      <SpeakingQuestion
        instructionText="Read the scenario carefully and respond appropriately in 30-40 seconds."
        prepTime={20}
        maxDuration={40}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        playOnce={playOnce}
        expectedText={content.text || ""}
      >
        <div className="rounded-lg bg-amber-50 dark:bg-slate-700/50 p-4 text-base text-gray-800 dark:text-slate-100">
          {content.text}
        </div>
      </SpeakingQuestion>
    );
  }

  // ---- SUMMARIZE GROUP DISCUSSION ----
  if (type === "SUMMARIZE_GROUP_DISCUSSION") {
    return (
      <SpeakingQuestion
        instructionText="Listen to the group discussion, then summarize the key points and differing viewpoints in your own words."
        prepTime={0}
        maxDuration={40}
        autoStartDelay={5}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        playOnce={playOnce}
        expectedText={content.text || ""}
        audioSrc={content.audioUrl || question.audioUrl || ""}
        audioLabel="Listen to the group discussion"
      />
    );
  }

  // ---- WRITE ESSAY ----
  if (type === "WRITE_ESSAY") {
    return (
      <>
        <QuestionInstruction type={type} />
        <WriteEssayQuestion
          question={question}
          content={content}
          totalMarks={totalMarks}
          submitted={submitted}
          onSubmit={onSubmit}
          onRegisterSubmit={(fn) => { internalSubmitFn.current = fn; }}
          allowCopyPaste={allowCopyPaste}
          onScoringChange={onScoringChange}
        />
      </>
    );
  }

  // ---- WRITE ESSAY LEGACY FALLBACK (unreachable, kept for safety) ----
  if (false) {
    const minW = content.minWords || 200;
    const maxW = content.maxWords || 300;
    const currentWords = (response || "").trim().split(/\s+/).filter(Boolean).length;
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-gray-800">{content.prompt}</p>
        </div>
        <textarea
          className="min-h-[200px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder={`Write your essay here (${minW}-${maxW} words)...`}
          value={response || ""}
          onChange={(e) => setResponse(e.target.value)}
          disabled={submitted}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Words: {currentWords}
          </span>
          {!submitted && (
            <Button onClick={() => {
              const withinRange = currentWords >= minW && currentWords <= maxW;
              const mistakes: ScoreResult["mistakes"] = [];
              if (currentWords < minW) {
                mistakes.push({ position: 0, yourAnswer: `${currentWords} words`, correctAnswer: `At least ${minW} words required` });
              }
              if (currentWords > maxW) {
                mistakes.push({ position: 0, yourAnswer: `${currentWords} words`, correctAnswer: `Maximum ${maxW} words allowed` });
              }
              onSubmit({
                text: response,
                scoreResult: {
                  marksEarned: 0,
                  marksTotal: totalMarks,
                  correct: 0,
                  total: 1,
                  mistakes,
                  pending: true,
                  message: withinRange
                    ? "Essay submitted. AI scoring pending."
                    : "Essay submitted, but word count is outside range.",
                } as ScoreResult,
              });
            }} disabled={!response?.trim()}>
              Submit Essay
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---- SUMMARIZE WRITTEN TEXT ----
  if (type === "SUMMARIZE_WRITTEN_TEXT") {
    return (
      <>
        <QuestionInstruction type={type} />
        <SummarizeWrittenTextQuestion
          question={question}
          content={content}
          totalMarks={totalMarks}
          submitted={submitted}
          onSubmit={onSubmit}
          onRegisterSubmit={(fn) => { internalSubmitFn.current = fn; }}
          allowCopyPaste={allowCopyPaste}
          onScoringChange={onScoringChange}
        />
      </>
    );
  }

  // ---- MCQ SINGLE ----
  if (type === "READING_MCQ_SINGLE" || type === "LISTENING_MCQ_SINGLE") {
    const isListening = type === "LISTENING_MCQ_SINGLE";
    internalSubmitFn.current = () => {
      if (response === null) return;
      const correctIdx = content.correctAnswer ?? content.correctAnswers?.[0];
      const isCorrect = response === correctIdx;
      onSubmit({
        answer: response,
        scoreResult: {
          marksEarned: isCorrect ? totalMarks : 0,
          marksTotal: totalMarks,
          correct: isCorrect ? 1 : 0,
          total: 1,
          mistakes: isCorrect ? [] : [{ position: 1, yourAnswer: content.options?.[response] ?? "—", correctAnswer: content.options?.[correctIdx] ?? "" }],
        } as ScoreResult,
      });
    };
    return (
      <div className="space-y-4">
        <QuestionInstruction type={type} />
        {isListening && (
          <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio" playOnce={playOnce} />
        )}
        {content.passage && (
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4 dark:bg-slate-800/50">
            {!isListening && !isMockTest ? (
              <ClickableMeaningText text={content.passage} className="text-sm leading-relaxed text-gray-800 dark:text-slate-200" />
            ) : (
              <p className="text-sm leading-relaxed text-gray-800 dark:text-slate-200">{content.passage}</p>
            )}
          </div>
        )}
        <p className="font-medium text-gray-900 dark:text-slate-100">{content.question}</p>
        <div className="space-y-2">
          {content.options?.map((opt: string, i: number) => {
            const isSelected = response === i;
            const correctIdx = content.correctAnswer ?? content.correctAnswers?.[0];
            const isCorrect = submitted && showFeedback && (i === correctIdx || content.correctAnswers?.includes(i));
            const isWrong = submitted && showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={i}
                onClick={() => !submitted && setResponse(i)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                  isCorrect ? "border-green-500 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300" :
                  isWrong ? "border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300" :
                  isSelected ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300" :
                  "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700/40"
                }`}
                disabled={submitted}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                  isCorrect ? "border-green-500 bg-green-600 text-white dark:border-green-600 dark:bg-green-700" :
                  isWrong ? "border-red-400 bg-red-500 text-white dark:border-red-600 dark:bg-red-700" :
                  isSelected ? "border-indigo-500 bg-indigo-600 text-white" :
                  "border-gray-300 text-gray-500 dark:border-slate-500 dark:text-slate-400"
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {submitted && showFeedback && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />}
                {submitted && showFeedback && isWrong && <XCircle className="h-5 w-5 text-red-500 dark:text-red-400" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- MCQ MULTIPLE ----
  if (type === "READING_MCQ_MULTIPLE" || type === "LISTENING_MCQ_MULTIPLE") {
    const selected: number[] = response || [];
    const isListening = type === "LISTENING_MCQ_MULTIPLE";
    internalSubmitFn.current = () => {
      if (selected.length === 0) return;
      const correct: number[] = content.correctAnswers || [];
      const correctSet = new Set(correct);
      const selectedSet = new Set<number>(selected);
      const correctCount = selected.filter((i: number) => correctSet.has(i)).length;
      const wrongSelected = selected.filter((i: number) => !correctSet.has(i));
      const missed = correct.filter((i) => !selectedSet.has(i));
      const fullyCorrect = wrongSelected.length === 0 && missed.length === 0;
      const partialRatio = correct.length > 0 ? correctCount / correct.length : 0;
      onSubmit({
        answers: selected,
        scoreResult: {
          marksEarned: fullyCorrect ? totalMarks : Math.round(totalMarks * partialRatio * 10) / 10,
          marksTotal: totalMarks,
          correct: correctCount,
          total: correct.length,
          mistakes: [
            ...wrongSelected.map((i: number) => ({ position: i + 1, yourAnswer: content.options?.[i] ?? "—", correctAnswer: "(Should not have selected this)" })),
            ...missed.map((i) => ({ position: i + 1, yourAnswer: "(Missed)", correctAnswer: content.options?.[i] ?? "" })),
          ],
        } as ScoreResult,
      });
    };
    return (
      <div className="space-y-4">
        <QuestionInstruction type={type} />
        {isListening && (
          <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio" playOnce={playOnce} />
        )}
        {content.passage && (
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4 dark:bg-slate-800/50">
            {!isListening && !isMockTest ? (
              <ClickableMeaningText text={content.passage} className="text-sm leading-relaxed text-gray-800 dark:text-slate-200" />
            ) : (
              <p className="text-sm leading-relaxed text-gray-800 dark:text-slate-200">{content.passage}</p>
            )}
          </div>
        )}
        <p className="font-medium text-gray-900 dark:text-slate-100">{content.question}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">Select all correct answers</p>
        <div className="space-y-2">
          {content.options?.map((opt: string, i: number) => {
            const isSelected = selected.includes(i);
            const isCorrect = submitted && showFeedback && (content.correctAnswers?.includes(i) ?? false);
            const isWrong = submitted && showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={i}
                onClick={() => {
                  if (submitted) return;
                  setResponse(
                    isSelected ? selected.filter((s: number) => s !== i) : [...selected, i]
                  );
                }}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                  isCorrect ? "border-green-500 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-950/30 dark:text-green-300" :
                  isWrong ? "border-red-500 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300" :
                  isSelected ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300" :
                  "border-gray-200 text-gray-700 hover:border-gray-300 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500"
                }`}
                disabled={submitted}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  isCorrect ? "border-green-500 bg-green-600 dark:border-green-600 dark:bg-green-700" :
                  isWrong ? "border-red-400 bg-red-500 dark:border-red-600 dark:bg-red-700" :
                  isSelected ? "border-indigo-500 bg-indigo-600" :
                  "border-gray-300 dark:border-slate-500"
                }`}>
                  {(isSelected || isCorrect || isWrong) && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- REORDER PARAGRAPHS ----
  if (type === "REORDER_PARAGRAPHS") {
    const paragraphs: string[] = content.paragraphs || [];
    const order: number[] = response || paragraphs.map((_: string, i: number) => i);

    // modelAnswer (e.g. "1, 5, 3, 2, 4") is the authoritative correct order.
    // Convert serial numbers (1-based) to 0-based paragraph indices.
    const correctOrder: number[] = (() => {
      if (question.modelAnswer) {
        const parts = question.modelAnswer
          .split(/[\s,]+/)
          .map(Number)
          .filter((n: number) => Number.isInteger(n) && n >= 1 && n <= paragraphs.length);
        if (parts.length === paragraphs.length) return parts.map((n: number) => n - 1);
      }
      return content.correctOrder || paragraphs.map((_: string, i: number) => i);
    })();

    internalSubmitFn.current = () => {
      const n = correctOrder.length;
      // Adjacent-pairs scoring (PTE standard): award credit for each pair of
      // paragraphs that appear in the correct relative order in the student's answer.
      const correctPosMap = new Map<number, number>();
      correctOrder.forEach((item, pos) => correctPosMap.set(item, pos));
      let correctPairs = 0;
      const totalPairs = n * (n - 1) / 2;
      for (let i = 0; i < n - 1; i++) {
        for (let j = i + 1; j < n; j++) {
          const ci = correctPosMap.get(order[i]) ?? -1;
          const cj = correctPosMap.get(order[j]) ?? -1;
          if (ci !== -1 && cj !== -1 && ci < cj) correctPairs++;
        }
      }
      // Position-based mistakes for feedback display
      const mistakes: ScoreResult["mistakes"] = [];
      order.forEach((paraIdx, pos) => {
        if (correctOrder[pos] !== paraIdx) {
          mistakes.push({
            position: pos + 1,
            yourAnswer: `Paragraph ${paraIdx + 1} placed at position ${pos + 1}`,
            correctAnswer: `Paragraph ${correctOrder[pos] + 1} should be at position ${pos + 1}`,
          });
        }
      });

      const ratio = totalPairs > 0 ? correctPairs / totalPairs : 0;
      onSubmit({
        order,
        scoreResult: {
          marksEarned: Math.round(totalMarks * ratio * 10) / 10,
          marksTotal: totalMarks,
          correct: correctPairs,
          total: totalPairs,
          mistakes,
        } as ScoreResult,
      });
    };
    return (
      <div className="space-y-4">
        <QuestionInstruction type={type} />
        <ReorderDnD
          paragraphs={paragraphs}
          order={order}
          onReorder={setResponse}
          submitted={submitted}
          correctOrder={correctOrder}
          showFeedback={showFeedback}
          isMockTest={isMockTest}
        />
        {((submitted && showFeedback) || showAnswer) && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
            <p className="text-xs font-semibold uppercase text-green-700 dark:text-green-400">Correct Order</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {correctOrder.map((paraIdx, pos) => (
                <span key={pos} className="flex items-center gap-1.5 rounded-md border border-green-200 bg-white px-2 py-1 text-sm text-green-800 dark:border-green-800 dark:bg-slate-800 dark:text-green-300">
                  <span className="text-xs text-green-500">#{pos + 1}</span>
                  <span className="font-semibold">{paraIdx + 1}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---- READING FILL BLANKS (DRAG) ----
  if (type === "READING_FILL_BLANKS_DRAG") {
    const modelAnswers = (question.modelAnswer || "")
      .split(/[\n,]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s && !/correct answers?/i.test(s) && !/model answer/i.test(s));
    return (
      <>
        <QuestionInstruction type={type} />
        <FillBlanksDrag
          passage={content.passage || ""}
          blanks={content.blanks || []}
          extraOptions={content.extraOptions || []}
          totalMarks={totalMarks}
          submitted={submitted}
          showAnswer={showAnswer}
          showFeedback={showFeedback}
          onSubmit={onSubmit}
          modelAnswers={modelAnswers}
          initialAnswers={Array.isArray(initialResponse) ? initialResponse : undefined}
        />
      </>
    );
  }

  // ---- READING FILL BLANKS (DROPDOWN) ----
  if (type === "READING_FILL_BLANKS_DROPDOWN") {
    return (
      <>
        <QuestionInstruction type={type} />
        <FillBlanksDropdown
          passage={content.passage || ""}
          blanks={content.blanks || []}
          options={content.options || content.blanks || []}
          totalMarks={totalMarks}
          submitted={submitted}
          showAnswer={showAnswer}
          showFeedback={showFeedback}
          onSubmit={onSubmit}
          onRegisterSubmit={(fn) => { internalSubmitFn.current = fn; }}
          initialAnswers={Array.isArray(initialResponse) ? initialResponse : undefined}
        />
      </>
    );
  }

  // ---- SUMMARIZE SPOKEN TEXT ----
  if (type === "SUMMARIZE_SPOKEN_TEXT") {
    return (
      <>
        <QuestionInstruction type={type} />
        <SummarizeSpokenTextQuestion
          question={question}
          content={content}
          totalMarks={totalMarks}
          submitted={submitted}
          onSubmit={onSubmit}
          playOnce={playOnce}
          onRegisterSubmit={(fn) => { internalSubmitFn.current = fn; }}
          allowCopyPaste={allowCopyPaste}
          onScoringChange={onScoringChange}
        />
      </>
    );
  }

  // ---- HIGHLIGHT CORRECT SUMMARY ----
  if (type === "HIGHLIGHT_CORRECT_SUMMARY") {
    internalSubmitFn.current = () => {
      if (response === null) return;
      const correctIdx = content.correctAnswer ?? content.correctAnswers?.[0];
      const isCorrect = response === correctIdx;
      onSubmit({
        answer: response,
        scoreResult: {
          marksEarned: isCorrect ? totalMarks : 0,
          marksTotal: totalMarks,
          correct: isCorrect ? 1 : 0,
          total: 1,
          mistakes: isCorrect ? [] : [{ position: 1, yourAnswer: content.options?.[response] ?? "—", correctAnswer: content.options?.[correctIdx] ?? "" }],
        } as ScoreResult,
      });
    };
    return (
      <div className="space-y-4">
        <QuestionInstruction type={type} />
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio" playOnce={playOnce} />
        <p className="font-medium text-gray-900">{content.question || "Which summary best matches the audio?"}</p>
        <div className="space-y-2">
          {content.options?.map((opt: string, i: number) => {
            const isSelected = response === i;
            const isCorrect = submitted && showFeedback && (content.correctAnswer === i || content.correctAnswers?.includes(i));
            const isWrong = submitted && showFeedback && isSelected && !isCorrect;
            return (
              <button
                key={i}
                onClick={() => !submitted && setResponse(i)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left text-sm transition ${
                  isCorrect ? "border-green-500 bg-green-50" :
                  isWrong ? "border-red-500 bg-red-50" :
                  isSelected ? "border-indigo-500 bg-indigo-50" :
                  "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                disabled={submitted}
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {submitted && showFeedback && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {submitted && showFeedback && isWrong && <XCircle className="h-5 w-5 text-red-500" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- HIGHLIGHT INCORRECT WORDS ----
  if (type === "HIGHLIGHT_INCORRECT_WORDS") {
    const transcript: string = content.transcript || content.text || "";
    const correctIncorrectIndices: number[] = Array.isArray(content.incorrectIndices)
      ? content.incorrectIndices
      : [];
    const tokens = transcript.split(/(\s+)/);
    const wordIndicesSet = new Set<number>(); // valid clickable token positions
    tokens.forEach((tok, i) => { if (/\S/.test(tok)) wordIndicesSet.add(i); });

    const selected: number[] = response || [];
    const selectedSet = new Set(selected);
    const correctSet = new Set(correctIncorrectIndices);

    const toggle = (i: number) => {
      if (submitted) return;
      setResponse(selected.includes(i) ? selected.filter((x) => x !== i) : [...selected, i]);
    };

    internalSubmitFn.current = () => {
      const mistakes: ScoreResult["mistakes"] = [];
      let correctCount = 0;
      correctIncorrectIndices.forEach((idx) => {
        if (selectedSet.has(idx)) {
          correctCount++;
        } else {
          mistakes.push({ position: idx, yourAnswer: "(not selected)", correctAnswer: tokens[idx] || "" });
        }
      });
      const falsePositives = selected.filter((i) => !correctSet.has(i));
      falsePositives.forEach((idx) => {
        mistakes.push({ position: idx, yourAnswer: tokens[idx] || "", correctAnswer: "(should not have selected this)" });
      });
      const totalCorrect = correctIncorrectIndices.length || 1;
      const netScore = Math.max(0, correctCount - falsePositives.length);
      onSubmit({
        answer: selected,
        scoreResult: {
          marksEarned: Math.round(totalMarks * (netScore / totalCorrect) * 10) / 10,
          marksTotal: totalMarks,
          correct: correctCount,
          total: totalCorrect,
          mistakes,
        } as ScoreResult,
      });
    };

    return (
      <div className="space-y-4">
        <QuestionInstruction type={type} />
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen carefully and find the wrong words" playOnce={playOnce} />
        <div className="rounded-lg border border-gray-200 bg-white p-5 leading-loose">
          {tokens.map((tok, i) => {
            if (!wordIndicesSet.has(i)) return <span key={i}>{tok}</span>;
            const isSelected = selectedSet.has(i);
            const isActuallyWrong = correctSet.has(i);
            // After submit: show right/wrong/missed
            let cls = "mx-0.5 inline-block cursor-pointer rounded px-1.5 py-0.5 transition";
            if (submitted && showFeedback) {
              if (isSelected && isActuallyWrong) cls += " bg-green-500 font-semibold text-white"; // correct catch
              else if (isSelected && !isActuallyWrong) cls += " bg-red-500 font-semibold text-white line-through"; // wrong selection
              else if (!isSelected && isActuallyWrong) cls += " bg-amber-200 font-semibold text-amber-900 underline decoration-wavy"; // missed
              else cls += " text-gray-800";
            } else if (submitted) {
              cls += isSelected ? " bg-teal-500 font-semibold text-white shadow-sm" : " text-gray-800";
            } else {
              cls += isSelected
                ? " bg-teal-500 font-semibold text-white shadow-sm"
                : " text-gray-800 hover:bg-teal-50";
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(i)}
                disabled={submitted}
                className={cls}
              >
                {tok}
              </button>
            );
          })}
        </div>

        {submitted && showFeedback && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-green-500" /> Correct catches
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-red-500" /> Wrong selections
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded bg-amber-200" /> Missed wrong words
              </span>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ---- SELECT MISSING WORD ----
  if (type === "SELECT_MISSING_WORD") {
    internalSubmitFn.current = () => {
      if (response === null) return;
      const correctIdx = content.correctAnswer ?? content.correctAnswers?.[0];
      const isCorrect = response === correctIdx;
      onSubmit({
        answer: response,
        scoreResult: {
          marksEarned: isCorrect ? totalMarks : 0,
          marksTotal: totalMarks,
          correct: isCorrect ? 1 : 0,
          total: 1,
          mistakes: isCorrect ? [] : [{ position: 1, yourAnswer: content.options?.[response] ?? "—", correctAnswer: content.options?.[correctIdx] ?? "" }],
        } as ScoreResult,
      });
    };
    return (
      <div className="space-y-4">
        <QuestionInstruction type={type} />
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen — last word is missing" playOnce={playOnce} />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {content.options?.map((opt: string, i: number) => {
            const isSelected = response === i;
            const isCorrect = submitted && showFeedback && (content.correctAnswer === i || content.correctAnswers?.includes(i));
            const isWrong = submitted && showFeedback && isSelected && !isCorrect;
            return (
              <button
                key={i}
                onClick={() => !submitted && setResponse(i)}
                className={`rounded-lg border p-3 text-sm font-medium transition ${
                  isCorrect ? "border-green-500 bg-green-50 text-green-700" :
                  isWrong ? "border-red-500 bg-red-50 text-red-700" :
                  isSelected ? "border-indigo-500 bg-indigo-50 text-indigo-700" :
                  "border-gray-200 hover:border-gray-300"
                }`}
                disabled={submitted}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ---- LISTENING FILL BLANKS ----
  if (type === "LISTENING_FILL_BLANKS") {
    return (
      <div className="space-y-4">
        <QuestionInstruction type={type} />
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio" playOnce={playOnce} />
        <FillBlanksText
          passage={content.passage || ""}
          blanks={content.blanks || []}
          totalMarks={totalMarks}
          submitted={submitted}
          showAnswer={showAnswer}
          showFeedback={showFeedback}
          onSubmit={onSubmit}
          onRegisterSubmit={(fn) => { internalSubmitFn.current = fn; }}
          initialAnswers={Array.isArray(initialResponse) ? initialResponse : undefined}
        />
      </div>
    );
  }

  // ---- WRITE FROM DICTATION ----
  if (type === "WRITE_FROM_DICTATION") {
    internalSubmitFn.current = () => {
      if (!response?.trim()) return;
      const normalize = (s: string) =>
        s.trim().toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
      const studentWords = normalize(response || "");
      const correctWords = normalize(content.correctText || "");
      const m = correctWords.length, n = studentWords.length;
      const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let ci = 1; ci <= m; ci++) {
        for (let cj = 1; cj <= n; cj++) {
          dp[ci][cj] = correctWords[ci - 1] === studentWords[cj - 1]
            ? dp[ci - 1][cj - 1] + 1
            : Math.max(dp[ci - 1][cj], dp[ci][cj - 1]);
        }
      }
      const matched = dp[m][n];
      const mistakes: ScoreResult["mistakes"] = [];
      let ri = m, rj = n;
      const missedPositions = new Set<number>();
      while (ri > 0 && rj > 0) {
        if (correctWords[ri - 1] === studentWords[rj - 1]) { ri--; rj--; }
        else if (dp[ri - 1][rj] >= dp[ri][rj - 1]) { missedPositions.add(ri - 1); ri--; }
        else { rj--; }
      }
      while (ri > 0) { missedPositions.add(ri - 1); ri--; }
      correctWords.forEach((w: string, idx: number) => {
        if (missedPositions.has(idx)) mistakes.push({ position: idx + 1, yourAnswer: "(missed or wrong)", correctAnswer: w });
      });
      onSubmit({
        text: response,
        scoreResult: {
          marksEarned: Math.round(totalMarks * (m > 0 ? matched / m : 0) * 10) / 10,
          marksTotal: totalMarks,
          correct: matched,
          total: m,
          mistakes,
        } as ScoreResult,
      });
    };
    return (
      <div className="space-y-4">
        <QuestionInstruction type={type} />
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen carefully — audio plays once" playOnce={playOnce} />
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="Type what you hear..."
          value={response || ""}
          onChange={(e) => setResponse(e.target.value)}
          disabled={submitted}
          onPaste={blockCP}
          onCopy={blockCP}
          onCut={blockCP}
        />
        {submitted && showFeedback && content.correctText && (
          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/40">
            <p className="text-xs font-medium text-green-800 dark:text-green-300">Correct answer:</p>
            <p className="text-sm text-green-900 dark:text-green-200">{content.correctText}</p>
          </div>
        )}
      </div>
    );
  }

  // ---- DEFAULT FALLBACK ----
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>
      <p className="text-sm text-gray-500">
        This question type renderer is in progress. Content shown as raw data.
      </p>
      {!submitted && (
        <Button onClick={() => onSubmit({ raw: true })}>Mark as Attempted</Button>
      )}
    </div>
  );
}

// ============================================================================
// AUDIO BLOCK — shows audio player or a clear "missing audio" warning
// ============================================================================

// Some browsers refuse certain niche MIME types (e.g. audio/vnd.dlna.adts)
// even though the underlying audio data (AAC, MP3, etc.) is fine.
// We rewrite to the closest browser-friendly equivalent.
function normalizeAudioSrc(src: string): string {
  if (!src.startsWith("data:")) return src;
  const remaps: Record<string, string> = {
    "audio/vnd.dlna.adts": "audio/aac",
    "audio/x-aac": "audio/aac",
    "audio/x-m4a": "audio/mp4",
    "audio/x-wav": "audio/wav",
    "audio/x-mpeg": "audio/mpeg",
    "audio/x-mp3": "audio/mpeg",
  };
  for (const [bad, good] of Object.entries(remaps)) {
    if (src.startsWith(`data:${bad};`)) {
      return src.replace(`data:${bad};`, `data:${good};`);
    }
  }
  return src;
}

export function AudioBlock({
  src,
  label,
  onDuration,
  onEnded,
  playOnce,
}: {
  src: string;
  label?: string;
  onDuration?: (seconds: number) => void;
  onEnded?: () => void;
  playOnce?: boolean;
}) {
  const audioSrc = normalizeAudioSrc((src || "").toString());
  const hasAudio = audioSrc.length > 5;
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Detect URL type for better diagnostics
  const isDataUrl = audioSrc.startsWith("data:");
  const isHttpUrl = audioSrc.startsWith("http://") || audioSrc.startsWith("https://");
  const isBlobUrl = audioSrc.startsWith("blob:");
  const urlPreview = audioSrc.length > 80 ? audioSrc.slice(0, 80) + "..." : audioSrc;

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      {label && (
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
          <Volume2 className="h-4 w-4" /> {label}
        </p>
      )}
      {hasAudio ? (
        <>
          <AudioPlayerCustom
            src={audioSrc}
            defaultVoice="Indian"
            onLoadedMetadata={(dur) => {
              setLoaded(true);
              setLoadError(false);
              if (onDuration) onDuration(dur);
            }}
            onError={() => setLoadError(true)}
            onEnded={onEnded}
            playOnce={playOnce}
          />
          {loadError && (
            <div className="mt-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
              ⚠ Audio file could not be loaded.{" "}
              {!isDataUrl && !isHttpUrl && !isBlobUrl && (
                <span>The URL format looks invalid (not http/https/data/blob).</span>
              )}
              {isHttpUrl && (
                <span>Check that the URL is publicly accessible.</span>
              )}
              {isDataUrl && (
                <span>The base64 data may be corrupted or truncated.</span>
              )}
              <details className="mt-1">
                <summary className="cursor-pointer">Show URL</summary>
                <code className="mt-1 block break-all rounded bg-white p-1 text-[10px] text-gray-700">
                  {urlPreview}
                </code>
              </details>
            </div>
          )}
          {!loaded && !loadError && (
            <p className="mt-1 text-[10px] italic text-gray-400">Loading audio metadata...</p>
          )}
        </>
      ) : (
        <p className="text-xs italic text-gray-500">
          No audio uploaded for this question. Ask your centre admin to add one.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SCORE SUMMARY CARD (shown after every submission)
// ============================================================================

const SKILL_META: Record<SkillKey, { label: string; color: string; bg: string; bar: string; border: string }> = {
  speaking:  { label: "Speaking",  color: "text-teal-700 dark:text-teal-400",    bg: "bg-teal-50 dark:bg-teal-950/50",    bar: "bg-teal-500",   border: "border-teal-200 dark:border-teal-800"   },
  listening: { label: "Listening", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/50", bar: "bg-orange-500", border: "border-orange-200 dark:border-orange-800" },
  reading:   { label: "Reading",   color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/50", bar: "bg-purple-500", border: "border-purple-200 dark:border-purple-800" },
  writing:   { label: "Writing",   color: "text-blue-700 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/50",    bar: "bg-blue-500",   border: "border-blue-200 dark:border-blue-800"   },
};

export function ScoreSummary({ result, lastAttemptScore, questionType }: { result: ScoreResult; lastAttemptScore: number | null; questionType?: string }) {
  const percent = result.marksTotal > 0 ? (result.marksEarned / result.marksTotal) * 100 : 0;
  const isPerfect = result.marksEarned === result.marksTotal && result.marksTotal > 0;
  const isFailed = result.marksEarned === 0 && !result.pending;

  // Overall score on 0-90 PTE scale (used for skill impact display)
  const overallScore90 = result.pending ? 0
    : result.aiScores?.overall != null ? Math.round(result.aiScores.overall)
    : result.marksTotal > 0 ? Math.round((result.marksEarned / result.marksTotal) * 90)
    : 0;

  const bgColor = result.pending
    ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
    : isPerfect
      ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
      : isFailed
        ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
        : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40";

  const iconBg = result.pending
    ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
    : isPerfect
      ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400"
      : isFailed
        ? "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400"
        : "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400";

  return (
    <div className={`rounded-xl border-2 p-5 ${bgColor}`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {result.pending ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : isPerfect ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : isFailed ? (
            <XCircle className="h-7 w-7" />
          ) : (
            <CheckCircle2 className="h-7 w-7" />
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {result.pending
              ? "Submitted — awaiting review"
              : isPerfect
                ? "Perfect score! 🎉"
                : isFailed
                  ? "No marks earned"
                  : "Partial credit"}
          </h3>
          {!result.pending && (
            <div className="mt-1 flex items-baseline gap-2 flex-wrap">
              <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{result.marksEarned}</span>
              <span className="text-sm text-gray-500 dark:text-slate-400">/ {result.marksTotal} marks</span>
              <span className="ml-2 text-sm font-medium text-gray-600 dark:text-slate-300">({Math.round(percent)}%)</span>
              {result.aiScores?.overall != null && lastAttemptScore !== null && (() => {
                const delta = Math.round(result.aiScores!.overall) - lastAttemptScore;
                return delta !== 0 ? (
                  <span className={`text-sm font-semibold ${delta > 0 ? "text-green-600" : "text-red-500"}`}>
                    {delta > 0 ? `↑${delta}` : `↓${Math.abs(delta)}`} vs last attempt
                  </span>
                ) : <span className="text-sm text-gray-400">Same as last attempt</span>;
              })()}
            </div>
          )}
          {result.pending && result.message && (
            <p className="mt-1 text-sm text-blue-800">{result.message}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!result.pending && (
        <div className="mt-4 h-2 w-full rounded-full bg-white dark:bg-slate-700/60">
          <div
            className={`h-full rounded-full transition-all ${
              isPerfect ? "bg-green-500" : isFailed ? "bg-red-500" : "bg-amber-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Correct count */}
      {!result.pending && result.total > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-gray-700 dark:text-slate-300">
            {result.correct} of {result.total} correct
          </span>
        </div>
      )}

      {/* Skill Impact — 4 skill scores based on cross-skill contribution model */}
      {!result.pending && questionType && SKILL_CONTRIBUTIONS[questionType] && (() => {
        const contrib = SKILL_CONTRIBUTIONS[questionType];
        return (
          <div className="mt-4 border-t border-black/5 pt-4 dark:border-white/5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Skill Impact</p>
            <div className="grid grid-cols-4 gap-2">
              {SKILL_KEYS.map(skill => {
                const isActive = contrib[skill] > 0;
                const meta = SKILL_META[skill];
                const pct = isActive ? Math.round((overallScore90 / 90) * 100) : 0;
                return (
                  <div
                    key={skill}
                    className={`rounded-lg border p-2 text-center ${
                      isActive
                        ? `${meta.bg} ${meta.border}`
                        : "border-gray-100 bg-gray-50/60 dark:border-slate-700 dark:bg-slate-800/30"
                    }`}
                  >
                    <p className={`text-xs font-medium ${isActive ? meta.color : "text-gray-300 dark:text-slate-600"}`}>
                      {meta.label}
                    </p>
                    <p className={`mt-0.5 text-base font-bold leading-none ${isActive ? meta.color : "text-gray-300 dark:text-slate-600"}`}>
                      {isActive ? overallScore90 : "—"}
                    </p>
                    {isActive && (
                      <div className="mt-1.5 h-1 w-full rounded-full bg-black/10 dark:bg-white/10">
                        <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-gray-400 dark:text-slate-500">Scores on 0–90 PTE scale · — means this skill is not tested by this question type</p>
          </div>
        );
      })()}

      {/* Mistakes */}
      {result.mistakes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-600 dark:text-slate-400">
            Mistakes to review ({result.mistakes.length})
          </p>
          <div className="space-y-2">
            {result.mistakes.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-red-200 bg-white p-3 text-sm dark:border-red-900 dark:bg-slate-700"
              >
                {m.position > 0 && (
                  <p className="mb-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                    Position #{m.position}
                  </p>
                )}
                <div className="flex items-start gap-2">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-red-700">
                      <span className="font-medium">Your answer:</span>{" "}
                      <span className="line-through">{m.yourAnswer}</span>
                    </p>
                    <p className="mt-1 text-green-700">
                      <span className="font-medium">Correct:</span> {m.correctAnswer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Score Breakdown */}
      {result.aiScores && Object.keys(result.aiScores).filter(k => k !== "overall").length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Score Breakdown</p>
          <div className="space-y-2">
            {Object.entries(result.aiScores)
              .filter(([key]) => key !== "overall")
              .map(([key, val]) => {
                const pct = Math.round((val / 90) * 100);
                const barColor = pct >= 67 ? "bg-green-500" : pct >= 33 ? "bg-amber-400" : "bg-red-400";
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs capitalize text-gray-600 dark:text-slate-300">{key}</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-slate-200">{val}/90</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/60">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Word-level pronunciation feedback for Read Aloud / Repeat Sentence */}
      {result.transcription && result.mistakes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Word-by-Word Feedback</p>
          <div className="rounded-lg bg-white/70 p-3 leading-loose">
            {(() => {
              const spokenWords = result.transcription.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
              const mistakePositions = new Set(result.mistakes.map(m => m.position - 1));
              return spokenWords.map((word, i) => (
                <span key={i} className={`mr-1 inline-block rounded px-1 py-0.5 text-sm ${
                  mistakePositions.has(i)
                    ? "bg-red-100 text-red-700 line-through"
                    : "bg-green-100 text-green-700"
                }`}>{word}</span>
              ));
            })()}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            <span className="inline-block rounded bg-green-100 px-1 text-green-700">green</span> = correct &nbsp;
            <span className="inline-block rounded bg-red-100 px-1 text-red-700 line-through">red</span> = wrong/missed
          </p>
        </div>
      )}

      {/* Plain transcription for other speaking types */}
      {result.transcription && result.mistakes.length === 0 && (
        <div className="mt-3 rounded-md bg-white/70 p-2 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Transcribed: </span>{result.transcription}
        </div>
      )}

      {/* Message at bottom if any */}
      {!result.pending && result.message && (
        <p className="mt-3 rounded-md bg-white p-2 text-xs text-gray-700 dark:bg-slate-800 dark:text-slate-200">
          💡 {result.message}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SPEAKING QUESTION WRAPPER
// ============================================================================

function SpeakingQuestion({
  children, instructionText, prepTime, maxDuration, submitted, onSubmit,
  totalMarks = 1, questionId, questionType, expectedText = "",
  audioSrc, audioLabel, autoStartDelay = 0, playOnce, mountAutoStart = false,
}: {
  children?: React.ReactNode;
  instructionText: string;
  prepTime: number;
  maxDuration: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
  totalMarks?: number;
  questionId?: string;
  questionType?: string;
  expectedText?: string;
  // When audioSrc is provided, we render the audio block AND
  // use (audio length + 15s) as the recording max duration
  audioSrc?: string;
  audioLabel?: string;
  // Seconds to wait after prompt audio ends before auto-starting recording (0 = disabled)
  playOnce?: boolean;
  autoStartDelay?: number;
  // Auto-start countdown immediately on mount (for types with no audio prompt, e.g. Read Aloud, Describe Image)
  mountAutoStart?: boolean;
}) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [promptAudioEnded, setPromptAudioEnded] = useState(false);
  const [showSpeakingTemplate, setShowSpeakingTemplate] = useState(false);
  const [preRecordCountdown, setPreRecordCountdown] = useState<number | null>(null);
  const [readyToRecord, setReadyToRecord] = useState(false);

  // Mount-based auto-start: for question types with no audio prompt (Read Aloud, Describe Image)
  useEffect(() => {
    if (mountAutoStart && !submitted) setPromptAudioEnded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // No-audio fallback: if autoStartDelay is set but no audio src, trigger immediately on mount
  useEffect(() => {
    if (autoStartDelay > 0 && !mountAutoStart && (!audioSrc || audioSrc.length <= 5) && !submitted) {
      setPromptAudioEnded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When auto-start triggers, run a visible countdown then flip readyToRecord
  useEffect(() => {
    if (!promptAudioEnded || submitted) return;
    if (autoStartDelay <= 0) { setReadyToRecord(true); return; }
    setPreRecordCountdown(autoStartDelay);
    const interval = setInterval(() => {
      setPreRecordCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setReadyToRecord(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptAudioEnded]);

  const speakingTemplate = questionType === "DESCRIBE_IMAGE"
    ? SPEAKING_TEMPLATES.DESCRIBE_IMAGE[0]
    : questionType === "RETELL_LECTURE"
      ? SPEAKING_TEMPLATES.RETELL_LECTURE
      : questionType === "RESPOND_TO_SITUATION"
        ? SPEAKING_TEMPLATES.RESPOND_TO_SITUATION
        : questionType === "SUMMARIZE_GROUP_DISCUSSION"
          ? SPEAKING_TEMPLATES.SUMMARIZE_GROUP_DISCUSSION
          : null;

  // Dynamic recording duration: if there's an audio prompt, give student
  // (audio length + 15s) to record. Otherwise fall back to fixed maxDuration.
  const RECORD_BUFFER_SEC = 15;
  const effectiveMaxDuration =
    audioSrc && audioDurationSec
      ? Math.ceil(audioDurationSec) + RECORD_BUFFER_SEC
      : maxDuration;

  const handleRecordingComplete = (blob: Blob, url: string) => {
    setAudioBlob(blob);
    setAudioUrl(url);
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Strip the "data:audio/webm;base64," prefix
        const base64 = result.includes(",") ? result.split(",")[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleSubmit = async () => {
    if (!audioBlob) return;

    // Default pending result
    let scoreResult: ScoreResult = {
      marksEarned: 0,
      marksTotal: totalMarks,
      correct: 0,
      total: 1,
      mistakes: [],
      pending: true,
      message: "Recording submitted. Your teacher will review soon.",
    };

    // Try AI scoring if we have the required info
    if (questionId && questionType && expectedText) {
      setScoring(true);
      try {
        const audioBase64 = await blobToBase64(audioBlob);
        const res = await fetch("/api/ai/score-speaking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId,
            audioBase64,
            expectedText,
            questionType,
          }),
        });
        const data = await res.json();

        if (res.status === 403 && data.limitReached) {
          scoreResult = {
            marksEarned: 0,
            marksTotal: totalMarks,
            correct: 0,
            total: 1,
            mistakes: [],
            pending: true,
            message: data.error || "Daily AI scoring limit reached. Upgrade to unlock unlimited scoring.",
          };
        } else if (data.success) {
          const { transcription, scores } = data.data;

          // Build mistakes by comparing word-by-word (for READ_ALOUD + REPEAT_SENTENCE)
          const mistakes: ScoreResult["mistakes"] = [];
          if (questionType === "READ_ALOUD" || questionType === "REPEAT_SENTENCE") {
            const studentWords = transcription.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
            const expectedWords = expectedText.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
            expectedWords.forEach((w: string, i: number) => {
              if (!studentWords[i] || studentWords[i] !== w) {
                mistakes.push({
                  position: i + 1,
                  yourAnswer: studentWords[i] || "(missed)",
                  correctAnswer: w,
                });
              }
            });
          }

          const overall = scores.overall || 0;
          scoreResult = {
            marksEarned: Math.round((overall / 90) * totalMarks * 10) / 10,
            marksTotal: totalMarks,
            correct: mistakes.length === 0 ? 1 : 0,
            total: 1,
            mistakes,
            message: scores.feedback || "",
            transcription,
            aiScores: {
              pronunciation: scores.pronunciation || 0,
              fluency: scores.fluency || 0,
              content: scores.content || 0,
              overall,
            },
          };
        } else {
          scoreResult.message = data.error || scoreResult.message;
        }
      } catch {
        scoreResult.message = "AI scoring failed. Recording saved — teacher will review.";
      } finally {
        setScoring(false);
      }
    }

    onSubmit({
      type: "audio",
      audioBlob,
      audioUrl,
      scoreResult,
    });
  };

  return (
    <div className="space-y-4">
      {audioSrc && (
        <AudioBlock
          src={audioSrc}
          label={audioLabel}
          onDuration={(sec) => {
            setAudioDurationSec(sec);
            // If audio has 0 duration (broken/empty file), trigger auto-start immediately
            if (sec === 0 && autoStartDelay > 0) setPromptAudioEnded(true);
          }}
          onEnded={autoStartDelay > 0 ? () => setPromptAudioEnded(true) : undefined}
          playOnce={playOnce}
        />
      )}
      {children}

      {/* Pre-recording countdown banner */}
      {!submitted && autoStartDelay > 0 && (
        preRecordCountdown !== null && preRecordCountdown > 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 text-center dark:border-amber-700 dark:bg-amber-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-500">Recording starts in</p>
            <p className="text-5xl font-bold tabular-nums text-amber-600 dark:text-amber-400">{preRecordCountdown}</p>
            <p className="text-xs text-amber-500 dark:text-amber-600">seconds — get ready to speak</p>
          </div>
        ) : !promptAudioEnded && audioSrc && audioSrc.length > 5 ? (
          <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
            <span className="text-xl">🎤</span>
            <div>
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">Recording starts automatically</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-500">{autoStartDelay}s after audio finishes playing</p>
            </div>
          </div>
        ) : null
      )}

      {/* Speaking Template */}
      {speakingTemplate && !submitted && (
        <div className="rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30">
          <button onClick={() => setShowSpeakingTemplate(t => !t)} className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-300">
            <span className="flex items-center gap-2"><TemplateIcon className="h-4 w-4" /> Answer Template</span>
            <span className="text-xs text-indigo-400 dark:text-indigo-500">{showSpeakingTemplate ? "Hide" : "Show"}</span>
          </button>
          {showSpeakingTemplate && (
            <div className="border-t border-indigo-100 dark:border-indigo-900 p-4">
              <pre className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700 dark:text-slate-300 font-sans">{speakingTemplate.template}</pre>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3">
        <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
          📌 {instructionText}
          {prepTime > 0 && ` You have ${prepTime}s to prepare.`}
          {mountAutoStart && autoStartDelay > 0 && ` Recording starts automatically in ${autoStartDelay}s.`}
          {!mountAutoStart && autoStartDelay > 0 && audioSrc && ` Recording starts automatically ${autoStartDelay}s after audio ends.`}
          {!mountAutoStart && autoStartDelay > 0 && (!audioSrc || audioSrc.length <= 5) && ` Recording starts automatically in ${autoStartDelay}s.`}
          {audioSrc && audioDurationSec
            ? ` Max recording time: ${effectiveMaxDuration}s (audio length ${Math.ceil(audioDurationSec)}s + 15s).`
            : ` Maximum recording time: ${effectiveMaxDuration}s.`}
        </p>
      </div>

      {!submitted && (
        <AudioRecorder
          maxDuration={effectiveMaxDuration}
          prepTime={prepTime}
          onRecordingComplete={handleRecordingComplete}
          autoStart={readyToRecord}
          autoStartDelay={0}
        />
      )}

      {submitted && audioUrl && (
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 p-3">
          <p className="mb-2 text-xs font-medium text-indigo-800 dark:text-indigo-300">Your recording:</p>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}

      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={!audioBlob || scoring}
          loading={scoring}
          className="gap-2"
        >
          {scoring ? "AI is scoring your answer..." : "Submit Recording"}
        </Button>
      )}

      {!submitted && !audioBlob && (
        <p className="text-xs text-gray-500">
          Please record your answer first. Click &ldquo;Start Recording&rdquo; above.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// SUMMARIZE WRITTEN TEXT — AI scored on submit
// ============================================================================
// ============================================================================
// SUMMARIZE SPOKEN TEXT — AI scored on submit
// ============================================================================
function SummarizeSpokenTextQuestion({
  question, content, totalMarks, submitted, onSubmit, playOnce, onRegisterSubmit, allowCopyPaste = false, onScoringChange,
}: {
  question: QuestionData;
  content: any;
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
  playOnce?: boolean;
  onRegisterSubmit?: (fn: () => void) => void;
  allowCopyPaste?: boolean;
  onScoringChange?: (scoring: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [scoring, setScoring] = useState(false);

  useEffect(() => { onScoringChange?.(scoring); }, [scoring]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentWords = text.trim().split(/\s+/).filter(Boolean).length;
  const withinRange = currentWords >= 50 && currentWords <= 70;

  const handleSubmit = async () => {
    setScoring(true);
    const mistakes: ScoreResult["mistakes"] = [];
    if (!withinRange) {
      mistakes.push({ position: 0, yourAnswer: `${currentWords} words`, correctAnswer: "Should be 50–70 words" });
    }
    try {
      const res = await fetch("/api/ai/score-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          responseText: text,
          questionType: "SUMMARIZE_SPOKEN_TEXT",
          prompt: content.topic || content.text || question.title || "",
          modelAnswer: question.modelAnswer || "",
        }),
      });
      const data = await res.json();
      if (data.success) {
        const { scores } = data.data;
        onSubmit({
          text,
          scoreResult: {
            marksEarned: Math.round(((scores.overall || 0) / 90) * totalMarks * 10) / 10,
            marksTotal: totalMarks,
            correct: mistakes.length === 0 ? 1 : 0,
            total: 1,
            mistakes,
            message: scores.feedback || "",
          } as ScoreResult,
        });
      } else {
        throw new Error(data.error || "Scoring failed");
      }
    } catch {
      onSubmit({
        text,
        scoreResult: {
          marksEarned: 0,
          marksTotal: totalMarks,
          correct: 0,
          total: 1,
          mistakes,
          pending: true,
          message: "AI scoring failed. Please try again.",
        } as ScoreResult,
      });
    } finally {
      setScoring(false);
    }
  };

  useEffect(() => {
    onRegisterSubmit?.(() => { if (text.trim() && !scoring) handleSubmit(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, scoring, submitted]);

  return (
    <div className="space-y-4">
      <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio carefully" playOnce={playOnce} />
      <p className="text-sm text-gray-500">Write a 50–70 word summary of what you heard in your own words.</p>
      <textarea
        className="min-h-[140px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        placeholder="Write your summary (50–70 words)..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted || scoring}
        onPaste={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
        onCopy={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
        onCut={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
      />
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${withinRange ? "text-green-600" : currentWords === 0 ? "text-gray-400" : "text-amber-600"}`}>
          Words: {currentWords} / 50–70
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARIZE WRITTEN TEXT — AI scored on submit
// ============================================================================
function SummarizeWrittenTextQuestion({
  question, content, totalMarks, submitted, onSubmit, onRegisterSubmit, allowCopyPaste = false, onScoringChange,
}: {
  question: QuestionData;
  content: any;
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
  onRegisterSubmit?: (fn: () => void) => void;
  allowCopyPaste?: boolean;
  onScoringChange?: (scoring: boolean) => void;
}) {
  const [text, setText] = useState("");
  const [scoring, setScoring] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10 * 60); // 10 minutes

  useEffect(() => { onScoringChange?.(scoring); }, [scoring]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasAutoSubmitted = useRef(false);

  const currentWords = text.trim().split(/\s+/).filter(Boolean).length;

  const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  const handleSubmit = async () => {
    const mistakes: ScoreResult["mistakes"] = [];
    const isSingleSentence =
      text.trim().split(/[.!?]+/).filter((s: string) => s.trim()).length <= 1;
    if (!isSingleSentence)
      mistakes.push({ position: 0, yourAnswer: "Multiple sentences", correctAnswer: "Should be ONE sentence only" });
    if (currentWords < 5 || currentWords > 75)
      mistakes.push({ position: 0, yourAnswer: `${currentWords} words`, correctAnswer: "Between 5–75 words" });

    setScoring(true);
    try {
      const res = await fetch("/api/ai/score-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          responseText: text,
          questionType: "SUMMARIZE_WRITTEN_TEXT",
          prompt: content.passage || "",
          modelAnswer: question.modelAnswer || "",
        }),
      });
      const data = await res.json();

      if (data.success) {
        const { scores } = data.data;
        onSubmit({
          text,
          scoreResult: {
            marksEarned: Math.round(((scores.overall || 0) / 90) * totalMarks * 10) / 10,
            marksTotal: totalMarks,
            correct: mistakes.length === 0 ? 1 : 0,
            total: 1,
            mistakes,
            message: scores.feedback || "",
            aiScores: {
              grammar: scores.grammar || 0,
              spelling: scores.spelling || 0,
              content: scores.content || 0,
              structure: scores.structure || 0,
              overall: scores.overall || 0,
            },
          } as ScoreResult,
        });
      } else {
        throw new Error(data.error || "AI scoring failed");
      }
    } catch {
      onSubmit({
        text,
        scoreResult: {
          marksEarned: 0,
          marksTotal: totalMarks,
          correct: 0,
          total: 1,
          mistakes,
          pending: true,
          message: mistakes.length === 0
            ? "AI scoring failed. Summary saved for teacher review."
            : "Summary submitted with format issues. See mistakes below.",
        } as ScoreResult,
      });
    } finally {
      setScoring(false);
    }
  };

  // Countdown — stops when submitted
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (submitted || hasAutoSubmitted.current || timeLeft > 0) return;
    hasAutoSubmitted.current = true;
    handleSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, submitted]);

  useEffect(() => {
    onRegisterSubmit?.(() => { if (text.trim() && !scoring) handleSubmit(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, scoring, submitted]);

  return (
    <div className="space-y-4">
      <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4 dark:bg-slate-800/50">
        <p className="text-sm leading-relaxed text-gray-800 dark:text-slate-200">{content.passage}</p>
      </div>
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        placeholder="Write a one-sentence summary (5-75 words)..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted || scoring}
        onPaste={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
        onCopy={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
        onCut={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="text-sm text-gray-500 dark:text-slate-400">Words: {currentWords} / 75</span>
        {!submitted && (
          <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-mono font-bold tabular-nums ${
            timeLeft <= 60 ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400" :
            timeLeft <= 3 * 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" :
            "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
          }`}>
            ⏱ {fmtTime(timeLeft)}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WRITE ESSAY — AI scored on submit
// ============================================================================
function WriteEssayQuestion({
  question, content, totalMarks, submitted, onSubmit, onRegisterSubmit, allowCopyPaste = false, onScoringChange,
}: {
  question: QuestionData;
  content: any;
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
  onRegisterSubmit?: (fn: () => void) => void;
  allowCopyPaste?: boolean;
  onScoringChange?: (scoring: boolean) => void;
}) {
  const DRAFT_KEY = `essay_draft_${question.id}`;
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) || ""; } catch { return ""; }
  });
  const [scoring, setScoring] = useState(false);

  useEffect(() => { onScoringChange?.(scoring); }, [scoring]); // eslint-disable-line react-hooks/exhaustive-deps
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes
  const hasAutoSubmitted = useRef(false);

  const fmtTime = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  const minW = content.minWords || 200;
  const maxW = content.maxWords || 300;
  const currentWords = text.trim().split(/\s+/).filter(Boolean).length;
  const withinRange = currentWords >= minW && currentWords <= maxW;

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (submitted || !text.trim()) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, text);
        setLastSaved(new Date());
      } catch {}
    }, 30000);
    return () => clearTimeout(timer);
  }, [text, submitted, DRAFT_KEY]);

  // Countdown — stops when submitted
  useEffect(() => {
    if (submitted) return;
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(interval);
  }, [submitted]);

  // Clear draft on submit
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} };

  const handleSubmit = async () => {
    const mistakes: ScoreResult["mistakes"] = [];
    if (currentWords < minW) mistakes.push({ position: 0, yourAnswer: `${currentWords} words`, correctAnswer: `At least ${minW} words required` });
    if (currentWords > maxW) mistakes.push({ position: 0, yourAnswer: `${currentWords} words`, correctAnswer: `Maximum ${maxW} words allowed` });

    setScoring(true);
    try {
      const res = await fetch("/api/ai/score-writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          responseText: text,
          questionType: "WRITE_ESSAY",
          prompt: content.prompt || "",
        }),
      });
      const data = await res.json();

      if (data.success) {
        const { scores } = data.data;
        clearDraft();
        onSubmit({
          text,
          scoreResult: {
            marksEarned: Math.round(((scores.overall || 0) / 90) * totalMarks * 10) / 10,
            marksTotal: totalMarks,
            correct: mistakes.length === 0 ? 1 : 0,
            total: 1,
            mistakes,
            message: scores.feedback || "",
            aiScores: {
              grammar: scores.grammar || 0,
              spelling: scores.spelling || 0,
              content: scores.content || 0,
              structure: scores.structure || 0,
              vocabulary: scores.vocabulary || 0,
              overall: scores.overall || 0,
            },
          } as ScoreResult,
        });
      } else {
        throw new Error(data.error || "Scoring failed");
      }
    } catch {
      onSubmit({
        text,
        scoreResult: {
          marksEarned: 0,
          marksTotal: totalMarks,
          correct: 0,
          total: 1,
          mistakes,
          pending: true,
          message: withinRange
            ? "Essay saved for teacher review."
            : "Essay saved with word count issues. See notes above.",
        } as ScoreResult,
      });
    } finally {
      setScoring(false);
    }
  };

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (submitted || hasAutoSubmitted.current || timeLeft > 0) return;
    hasAutoSubmitted.current = true;
    handleSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, submitted]);

  useEffect(() => {
    onRegisterSubmit?.(() => { if (text.trim() && !scoring) handleSubmit(); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, scoring, submitted]);

  const essayTemplates = WRITING_TEMPLATES.WRITE_ESSAY;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-gray-800">{content.prompt}</p>
      </div>

      {/* Template Panel */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50">
        <button
          onClick={() => setShowTemplates(t => !t)}
          className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-indigo-700"
        >
          <span className="flex items-center gap-2"><TemplateIcon className="h-4 w-4" /> Essay Templates</span>
          <span className="text-xs text-indigo-400">{showTemplates ? "Hide" : "Show"}</span>
        </button>
        {showTemplates && (
          <div className="border-t border-indigo-100 p-4 space-y-3">
            <div className="flex gap-2">
              {essayTemplates.map((t, i) => (
                <button key={i} onClick={() => setActiveTemplate(i)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${activeTemplate === i ? "bg-indigo-600 text-white" : "bg-white text-indigo-600 border border-indigo-200"}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="rounded-lg bg-white p-3 text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">
              {essayTemplates[activeTemplate].structure}
            </div>
            <button
              onClick={() => { setText(essayTemplates[activeTemplate].template); setShowTemplates(false); }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Use this template as starting point →
            </button>
          </div>
        )}
      </div>

      <textarea
        className="min-h-[200px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        placeholder={`Write your essay here (${minW}–${maxW} words)...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted || scoring}
        onPaste={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
        onCopy={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
        onCut={!allowCopyPaste ? (e) => e.preventDefault() : undefined}
      />
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-sm font-medium ${
            currentWords === 0 ? "text-gray-400" :
            withinRange ? "text-green-600" : "text-amber-600"
          }`}>
            {currentWords} / {minW}–{maxW} words
          </span>
          {lastSaved && !submitted && (
            <span className="text-xs text-gray-400">
              Draft saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!submitted && (
            <span className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-mono font-bold tabular-nums ${
              timeLeft <= 60 ? "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400" :
              timeLeft <= 5 * 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400" :
              "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300"
            }`}>
              ⏱ {fmtTime(timeLeft)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FILL BLANKS HELPERS
// ============================================================================

// Split a passage into text segments and blank placeholders.
// Blanks can be marked as: __, ___, _____, [blank], or {{BLANK}}
function splitPassage(passage: string): string[] {
  return passage
    .split(/(_{2,}|\[blank\]|\{\{\s*blank\s*\}\})/gi)
    .filter((s) => s !== undefined);
}

const BLANK_MARKER_REGEX = /^(_{2,}|\[blank\]|\{\{\s*blank\s*\}\})$/i;

// Normalize a blank entry to { options, correctAnswer }
// Supports both formats:
//   - simple: "word" (string)
//   - rich: { index, options, correctAnswer }
type BlankEntry = { correctAnswer: string; options: string[] };

function normalizeBlank(b: any, fallbackOptions: string[]): BlankEntry {
  if (typeof b === "string") {
    return { correctAnswer: b, options: fallbackOptions };
  }
  if (b && typeof b === "object") {
    return {
      correctAnswer: b.correctAnswer || b.answer || "",
      options: Array.isArray(b.options) && b.options.length > 0 ? b.options : fallbackOptions,
    };
  }
  return { correctAnswer: "", options: fallbackOptions };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// -------------------- DRAG-AND-DROP FILL BLANKS --------------------
function FillBlanksDrag({
  passage, blanks, extraOptions = [], submitted, showAnswer = false, showFeedback = true, onSubmit, totalMarks, modelAnswers = [], initialAnswers, onRegisterSubmit,
}: {
  passage: string;
  blanks: any[];
  extraOptions?: string[];
  totalMarks: number;
  submitted: boolean;
  showAnswer?: boolean;
  showFeedback?: boolean;
  onSubmit: (response: any) => void;
  modelAnswers?: string[];
  initialAnswers?: (string | null)[];
  onRegisterSubmit?: (fn: () => void) => void;
}) {
  const segments = splitPassage(passage);
  const blankCount = segments.filter((s) => BLANK_MARKER_REGEX.test(s)).length;

  // Normalize blanks. Handle the case where admin stored all words as one
  // space-separated string (e.g. blanks=["melt frequent adopt critical borrow"])
  // — split those into individual words and treat them as the word bank.
  const rawNormalized = blanks.map((b) => normalizeBlank(b, []));

  // Flatten: any entry whose correctAnswer has spaces → split into individual words
  const flatWords: string[] = [];
  rawNormalized.forEach((b) => {
    if (b.correctAnswer.includes(" ")) {
      b.correctAnswer.split(/\s+/).filter(Boolean).forEach((w) => flatWords.push(w));
    } else if (b.correctAnswer) {
      flatWords.push(b.correctAnswer);
    }
  });

  // If we ended up with more flat words than blanks, the data is a word bank list
  // rather than per-blank correct answers — use flat mode.
  const useFlatMode = flatWords.length > blankCount && blankCount > 0;

  // In flat mode, use modelAnswers for per-blank correct answers if available
  const normalizedBlanks = useFlatMode
    ? Array(blankCount).fill(null).map((_, i) => ({
        correctAnswer: modelAnswers[i] || "",
        options: [] as string[],
      }))
    : rawNormalized;

  // Build word bank
  const wordBank = (() => {
    const extras = extraOptions.filter(Boolean);
    if (useFlatMode) return [...flatWords, ...extras];
    const hasPerBlankOptions = normalizedBlanks.some((b) => b.options && b.options.length > 0);
    if (hasPerBlankOptions) {
      const allOpts = new Set<string>();
      normalizedBlanks.forEach((b) => b.options.forEach((o: string) => allOpts.add(o)));
      extras.forEach((o) => allOpts.add(o));
      return Array.from(allOpts);
    }
    return [...normalizedBlanks.map((b) => b.correctAnswer).filter(Boolean), ...extras];
  })();

  const [filled, setFilled] = useState<(string | null)[]>(() => {
    if (initialAnswers && initialAnswers.length > 0) return initialAnswers;
    return Array(Math.max(blankCount, normalizedBlanks.length)).fill(null);
  });
  const [bank, setBank] = useState<string[]>(() => {
    if (initialAnswers && initialAnswers.length > 0) {
      // Remove pre-filled answers from the bank
      const usedWords = new Set(initialAnswers.filter(Boolean) as string[]);
      return shuffle(wordBank.filter(w => !usedWords.has(w)));
    }
    return shuffle(wordBank);
  });
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<"bank" | number | null>(null);

  const placeWord = (word: string, blankIndex: number, fromBlank?: number) => {
    // Return displaced word to bank
    setFilled((prev) => {
      const next = [...prev];
      const displaced = next[blankIndex];
      if (displaced && displaced !== word) {
        setBank((b) => [...b, displaced]);
      }
      next[blankIndex] = word;
      return next;
    });
    // Remove from bank only if it came from the bank (not from another blank)
    if (fromBlank === undefined) {
      setBank((prev) => {
        const idx = prev.indexOf(word);
        if (idx === -1) return prev;
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    } else {
      // Came from another blank — clear that blank
      setFilled((prev) => {
        const next = [...prev];
        if (next[fromBlank] === word) next[fromBlank] = null;
        return next;
      });
    }
    setSelectedWord(null);
  };

  const removeFromBlank = (blankIndex: number) => {
    if (submitted) return;
    const word = filled[blankIndex];
    if (!word) return;
    setFilled((prev) => {
      const next = [...prev];
      next[blankIndex] = null;
      return next;
    });
    setBank((prev) => [...prev, word]);
  };

  const handleBlankClick = (blankIndex: number) => {
    if (submitted) return;
    if (filled[blankIndex]) {
      removeFromBlank(blankIndex);
    } else if (selectedWord) {
      placeWord(selectedWord, blankIndex);
    }
  };

  const handleBankClick = (word: string) => {
    if (submitted) return;
    setSelectedWord(selectedWord === word ? null : word);
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  // Drag from bank
  const handleBankDragStart = (word: string) => {
    setDraggedWord(word);
    setDragSource("bank");
  };

  // Drag from a filled blank
  const handleBlankDragStart = (word: string, blankIndex: number) => {
    setDraggedWord(word);
    setDragSource(blankIndex);
  };

  const handleDropOnBlank = (e: React.DragEvent, blankIndex: number) => {
    e.preventDefault();
    if (submitted || !draggedWord) return;
    if (dragSource === "bank") {
      placeWord(draggedWord, blankIndex);
    } else if (typeof dragSource === "number" && dragSource !== blankIndex) {
      placeWord(draggedWord, blankIndex, dragSource);
    }
    setDraggedWord(null);
    setDragSource(null);
  };

  const handleDropOnBank = (e: React.DragEvent) => {
    e.preventDefault();
    if (submitted || !draggedWord || typeof dragSource !== "number") return;
    removeFromBlank(dragSource);
    setDraggedWord(null);
    setDragSource(null);
  };

  const allFilled = filled.slice(0, blankCount).every((f) => f !== null);
  let blankIdx = -1;

  // Register submit handler so parent (Next button) can trigger it
  useEffect(() => {
    onRegisterSubmit?.(() => {
      if (!allFilled) return;
      submitDragBlanks();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filled, allFilled, submitted]);

  const submitDragBlanks = () => {
    if (useFlatMode) {
      const hasModelAnswers = modelAnswers.length >= blankCount;
      if (hasModelAnswers) {
        const mistakes: ScoreResult["mistakes"] = [];
        let correctCount = 0;
        normalizedBlanks.forEach((b, i) => {
          const given = (filled[i] || "").trim().toLowerCase();
          const expected = (b.correctAnswer || "").trim().toLowerCase();
          if (expected && given === expected) {
            correctCount++;
          } else {
            mistakes.push({ position: i + 1, yourAnswer: (filled[i] || "").trim() || "(empty)", correctAnswer: (b.correctAnswer || "").trim() || "—" });
          }
        });
        const ratio = blankCount > 0 ? correctCount / blankCount : 0;
        onSubmit({ answers: filled, scoreResult: { marksEarned: Math.round(totalMarks * ratio * 10) / 10, marksTotal: totalMarks, correct: correctCount, total: blankCount, mistakes } as ScoreResult });
      } else {
        onSubmit({ answers: filled, scoreResult: { marksEarned: 0, marksTotal: totalMarks, correct: 0, total: blankCount, mistakes: [], pending: true, message: "Submitted for teacher review. Add a model answer to enable auto-scoring." } as ScoreResult });
      }
      return;
    }
    const mistakes: ScoreResult["mistakes"] = [];
    let correctCount = 0;
    normalizedBlanks.forEach((b, i) => {
      const given = (filled[i] || "").trim();
      const correct = (b.correctAnswer || "").trim();
      if (given.toLowerCase() === correct.toLowerCase()) {
        correctCount++;
      } else {
        mistakes.push({ position: i + 1, yourAnswer: given || "(empty)", correctAnswer: correct });
      }
    });
    const total = normalizedBlanks.length || 1;
    onSubmit({ answers: filled, scoreResult: { marksEarned: Math.round(totalMarks * (correctCount / total) * 10) / 10, marksTotal: totalMarks, correct: correctCount, total, mistakes } as ScoreResult });
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-slate-400">
        {submitted
          ? "Correct answers are shown in green. Wrong answers in red."
          : "Drag a word from the bank into a blank, or tap a word then tap a blank to place it."}
      </p>

      {/* Passage with blanks */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-base leading-loose text-gray-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
        {segments.map((seg, i) => {
          if (BLANK_MARKER_REGEX.test(seg)) {
            blankIdx++;
            const thisIndex = blankIdx;
            const word = filled[thisIndex];
            const correct = normalizedBlanks[thisIndex]?.correctAnswer;
            const isCorrect =
              submitted && showFeedback && word && correct && normAns(word) === normAns(correct);
            const isWrong =
              submitted && showFeedback && (!word || (correct && word.toLowerCase() !== correct.toLowerCase()));

            return (
              <span
                key={`blank-${i}`}
                draggable={!submitted && !!word}
                onDragStart={() => word && handleBlankDragStart(word, thisIndex)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnBlank(e, thisIndex)}
                onClick={() => handleBlankClick(thisIndex)}
                className={`mx-1 inline-flex min-w-[100px] cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-3 py-1 text-sm font-medium transition select-none ${
                  submitted && showFeedback
                    ? isCorrect
                      ? "border-green-500 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-950/60 dark:text-green-300"
                      : "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/50 dark:text-red-300"
                    : submitted
                      ? word
                        ? "border-gray-300 bg-gray-50 text-gray-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-300"
                        : "border-gray-200 bg-white text-gray-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
                      : word
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 cursor-grab active:cursor-grabbing dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : selectedWord
                          ? "border-indigo-300 bg-indigo-50 text-gray-400 animate-pulse dark:border-indigo-600 dark:bg-indigo-950/30 dark:text-slate-400"
                          : "border-gray-300 bg-white text-gray-400 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30"
                }`}
                title={word ? "Drag or tap to remove" : "Tap or drop a word here"}
              >
                <span className="flex items-center gap-1">
                  {word || "drop here"}
                  {submitted && showFeedback && isCorrect && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {submitted && showFeedback && isWrong && <XCircle className="h-3.5 w-3.5" />}
                </span>
                {submitted && showFeedback && isWrong && correct && (
                  <span className="text-xs font-semibold text-green-700 mt-0.5 dark:text-green-400">✓ {correct}</span>
                )}
              </span>
            );
          }
          return (
            <span key={`text-${i}`} className="whitespace-pre-wrap">
              {seg}
            </span>
          );
        })}
      </div>

      {/* Word Bank */}
      {!submitted && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-slate-400">Word Bank</p>
          <div
            className="flex flex-wrap gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-white p-4 min-h-[60px] dark:border-slate-600 dark:bg-slate-800"
            onDragOver={handleDragOver}
            onDrop={handleDropOnBank}
          >
            {bank.length === 0 ? (
              <p className="text-sm italic text-gray-400 dark:text-slate-500">All words placed. Drag or tap a blank to return a word.</p>
            ) : (
              bank.map((word, i) => (
                <button
                  key={`${word}-${i}`}
                  draggable
                  onDragStart={() => handleBankDragStart(word)}
                  onClick={() => handleBankClick(word)}
                  className={`cursor-grab rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition active:cursor-grabbing active:scale-95 ${
                    selectedWord === word
                      ? "border-indigo-500 bg-indigo-600 text-white shadow-md"
                      : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/40"
                  }`}
                >
                  {word}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Correct Answers (after submit OR when Show Answer is toggled) */}
      {((submitted && showFeedback) || showAnswer) && normalizedBlanks.some(b => b.correctAnswer) && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <p className="text-xs font-semibold uppercase text-green-700 dark:text-green-400">Correct Answers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedBlanks.map((b, i) =>
              b.correctAnswer ? (
                <span key={i} className="rounded-md bg-white px-2 py-1 text-sm text-green-800 border border-green-200 dark:bg-slate-800 dark:text-green-300 dark:border-green-700">
                  <span className="mr-1 text-xs text-green-500 dark:text-green-500">#{i + 1}</span>
                  {b.correctAnswer}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// -------------------- DROPDOWN FILL BLANKS --------------------
function FillBlanksDropdown({
  passage, blanks, options, submitted, showAnswer = false, showFeedback = true, onSubmit, totalMarks, initialAnswers, onRegisterSubmit,
}: {
  passage: string;
  blanks: any[];
  options: string[];
  totalMarks: number;
  submitted: boolean;
  showAnswer?: boolean;
  showFeedback?: boolean;
  onSubmit: (response: any) => void;
  initialAnswers?: string[];
  onRegisterSubmit?: (fn: () => void) => void;
}) {
  const segments = splitPassage(passage);
  const normalizedBlanks = blanks.map((b) => normalizeBlank(b, options));
  const blankCount = segments.filter((s) => BLANK_MARKER_REGEX.test(s)).length;
  const [answers, setAnswers] = useState<string[]>(() =>
    initialAnswers && initialAnswers.length > 0
      ? initialAnswers
      : Array(Math.max(blankCount, normalizedBlanks.length)).fill("")
  );

  let blankIdx = -1;
  const allFilled = answers.every((a) => a);

  useEffect(() => {
    onRegisterSubmit?.(() => {
      if (!allFilled) return;
      const mistakes: ScoreResult["mistakes"] = [];
      let correctCount = 0;
      normalizedBlanks.forEach((b, i) => {
        const given = (answers[i] || "").trim();
        const correct = (b.correctAnswer || "").trim();
        if (normAns(given) === normAns(correct)) {
          correctCount++;
        } else {
          mistakes.push({ position: i + 1, yourAnswer: given || "(empty)", correctAnswer: correct });
        }
      });
      const total = normalizedBlanks.length || 1;
      onSubmit({ answers, scoreResult: { marksEarned: Math.round(totalMarks * (correctCount / total) * 10) / 10, marksTotal: totalMarks, correct: correctCount, total, mistakes } as ScoreResult });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, allFilled, submitted]);

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-slate-400">
        Pick the correct word from the dropdown for each blank.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-base leading-loose text-gray-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
        {segments.map((seg, i) => {
          if (BLANK_MARKER_REGEX.test(seg)) {
            blankIdx++;
            const thisIndex = blankIdx;
            const value = answers[thisIndex];
            const blank = normalizedBlanks[thisIndex] || { correctAnswer: "", options: [] };
            const isCorrect =
              submitted && showFeedback && value && blank.correctAnswer &&
              normAns(value) === normAns(blank.correctAnswer);

            const isWrongDropdown = submitted && showFeedback && !isCorrect;
            return (
              <span key={`blank-${i}`} className="mx-1 inline-flex flex-col items-center">
                <select
                  value={value}
                  onChange={(e) => {
                    const next = [...answers];
                    next[thisIndex] = e.target.value;
                    setAnswers(next);
                  }}
                  disabled={submitted}
                  className={`rounded-md border-2 px-2 py-1 text-sm font-medium transition ${
                    submitted && showFeedback
                      ? isCorrect
                        ? "border-green-500 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-950/60 dark:text-green-300"
                        : "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/50 dark:text-red-300"
                      : submitted
                        ? "border-gray-300 bg-gray-50 text-gray-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      : value
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "border-gray-300 bg-white text-gray-500 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                >
                  <option value="">— choose —</option>
                  {(blank.options || []).map((opt, j) => (
                    <option key={j} value={opt.trim()}>{opt.trim()}</option>
                  ))}
                </select>
                {isWrongDropdown && blank.correctAnswer && (
                  <span className="text-xs font-semibold text-green-700 mt-0.5 dark:text-green-400">✓ {blank.correctAnswer}</span>
                )}
              </span>
            );
          }
          return (
            <span key={`text-${i}`} className="whitespace-pre-wrap">
              {seg}
            </span>
          );
        })}
      </div>

      {((submitted && showFeedback) || showAnswer) && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <p className="text-xs font-semibold uppercase text-green-700 dark:text-green-400">Correct Answers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedBlanks.map((b, i) => (
              <span key={i} className="rounded-md bg-white px-2 py-1 text-sm text-green-800 border border-green-200 dark:bg-slate-800 dark:text-green-300 dark:border-green-700">
                <span className="mr-1 text-xs text-green-500 dark:text-green-500">#{i + 1}</span>
                {b.correctAnswer}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

// -------------------- TEXT INPUT FILL BLANKS (for Listening) --------------------
function FillBlanksText({
  passage, blanks, submitted, showAnswer = false, showFeedback = true, onSubmit, totalMarks, initialAnswers, onRegisterSubmit,
}: {
  passage: string;
  blanks: any[];
  totalMarks: number;
  submitted: boolean;
  showAnswer?: boolean;
  showFeedback?: boolean;
  onSubmit: (response: any) => void;
  initialAnswers?: string[];
  onRegisterSubmit?: (fn: () => void) => void;
}) {
  const segments = splitPassage(passage);
  const normalizedBlanks = blanks.map((b) => normalizeBlank(b, []));
  const blankCount = segments.filter((s) => BLANK_MARKER_REGEX.test(s)).length;
  const [answers, setAnswers] = useState<string[]>(() =>
    initialAnswers && initialAnswers.length > 0
      ? initialAnswers
      : Array(Math.max(blankCount, normalizedBlanks.length)).fill("")
  );

  let blankIdx = -1;
  const allFilled = answers.every((a) => a.trim());

  useEffect(() => {
    onRegisterSubmit?.(() => {
      const mistakes: ScoreResult["mistakes"] = [];
      let correctCount = 0;
      normalizedBlanks.forEach((b, i) => {
        const given = (answers[i] || "").trim();
        const correct = (b.correctAnswer || "").trim();
        if (normAns(given) === normAns(correct)) {
          correctCount++;
        } else {
          mistakes.push({ position: i + 1, yourAnswer: given || "(empty)", correctAnswer: correct });
        }
      });
      const total = normalizedBlanks.length || 1;
      onSubmit({ answers, scoreResult: { marksEarned: Math.round(totalMarks * (correctCount / total) * 10) / 10, marksTotal: totalMarks, correct: correctCount, total, mistakes } as ScoreResult });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, allFilled, submitted]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-base leading-loose text-gray-800 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200">
        {segments.map((seg, i) => {
          if (BLANK_MARKER_REGEX.test(seg)) {
            blankIdx++;
            const thisIndex = blankIdx;
            const value = answers[thisIndex];
            const correct = normalizedBlanks[thisIndex]?.correctAnswer?.trim();
            const isCorrect =
              submitted && showFeedback && value && correct && normAns(value) === normAns(correct);

            const isWrongText = submitted && showFeedback && !isCorrect;
            return (
              <span key={`blank-${i}`} className="mx-1 inline-flex flex-col items-center">
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    const next = [...answers];
                    next[thisIndex] = e.target.value;
                    setAnswers(next);
                  }}
                  disabled={submitted}
                  placeholder="..."
                  className={`inline-block w-32 rounded-md border-2 px-2 py-1 text-sm font-medium transition ${
                    submitted && showFeedback
                      ? isCorrect
                        ? "border-green-500 bg-green-100 text-green-800 dark:border-green-600 dark:bg-green-950/60 dark:text-green-300"
                        : "border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-950/50 dark:text-red-300"
                      : submitted
                        ? "border-gray-300 bg-gray-50 text-gray-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-300"
                      : value
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-300"
                        : "border-gray-300 bg-white text-gray-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-400"
                  }`}
                />
                {isWrongText && correct && (
                  <span className="text-xs font-semibold text-green-700 dark:text-green-400 mt-0.5">✓ {correct}</span>
                )}
              </span>
            );
          }
          return (
            <span key={`text-${i}`} className="whitespace-pre-wrap">
              {seg}
            </span>
          );
        })}
      </div>

      {((submitted && showFeedback) || showAnswer) && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <p className="text-xs font-semibold uppercase text-green-700 dark:text-green-400">Correct Answers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedBlanks.map((b, i) => (
              <span key={i} className="rounded-md bg-white px-2 py-1 text-sm text-green-800 border border-green-200 dark:bg-slate-800 dark:text-green-300 dark:border-green-700">
                <span className="mr-1 text-xs text-green-500 dark:text-green-500">#{i + 1}</span>
                {b.correctAnswer}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

