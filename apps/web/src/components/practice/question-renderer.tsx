"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AudioRecorder } from "@/components/practice/audio-recorder";
import { AudioPlayerCustom } from "@/components/practice/audio-player-custom";
import {
  CheckCircle2, XCircle, Loader2, Volume2,
  BookOpen as TemplateIcon, GripVertical,
} from "lucide-react";
import { WRITING_TEMPLATES, SPEAKING_TEMPLATES } from "@/lib/templates";

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

// ─── Components ───────────────────────────────────────────────────────────────

// ==========================================================================
// ==========================================================================
// Drag-and-drop reorder component for REORDER_PARAGRAPHS
// ==========================================================================
function ReorderDnD({
  paragraphs, order, onReorder, submitted, correctOrder, showFeedback = true,
}: {
  paragraphs: string[];
  order: number[];
  onReorder: (newOrder: number[]) => void;
  submitted: boolean;
  correctOrder: number[];
  showFeedback?: boolean;
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
                    ? "border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950/30"
                    : "border-red-500 bg-red-50 dark:border-red-700 dark:bg-red-950/30"
                  : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800"
                : isDragOver
                  ? "border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/30 shadow-md"
                  : isDragging
                    ? "border-indigo-300 bg-indigo-50/50 dark:border-indigo-700 opacity-50"
                    : "border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 cursor-grab hover:border-gray-300 dark:hover:border-slate-500"
            }`}
          >
            {!submitted && (
              <GripVertical className="mt-0.5 h-5 w-5 shrink-0 text-gray-300 dark:text-slate-600" />
            )}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600 dark:bg-slate-700 dark:text-slate-300">
              {paraIdx + 1}
            </span>
            <p className="flex-1 text-sm text-gray-800 dark:text-slate-200">{paragraphs[paraIdx]}</p>
            {/* Arrow buttons shown only on mobile where drag isn't reliable */}
            {!submitted && (
              <div className="flex flex-col gap-1 sm:hidden">
                <button onClick={() => moveUp(position)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700">▲</button>
                <button onClick={() => moveDown(position)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100 dark:text-slate-500 dark:hover:bg-slate-700">▼</button>
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
export function QuestionRenderer({
  question, submitted, showAnswer = false, showFeedback = true, onSubmit, onResponseChange, initialResponse,
}: {
  question: QuestionData;
  submitted: boolean;
  showAnswer?: boolean;
  showFeedback?: boolean;
  onSubmit: (response: any) => void;
  onResponseChange?: (response: any) => void;
  initialResponse?: any;
  score?: any;
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

  if (!question || !content) return null;

  const type = question.type;
  const totalMarks = question.marks && question.marks > 0 ? question.marks : 1;

  // ---- READ ALOUD ----
  if (type === "READ_ALOUD") {
    return (
      <SpeakingQuestion
        instructionText="Read the text above aloud, clearly and naturally."
        prepTime={5}
        maxDuration={40}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        expectedText={content.text || ""}
      >
        <div className="rounded-lg bg-amber-50 dark:bg-slate-700/50 p-4 text-lg leading-relaxed text-gray-800 dark:text-slate-100">
          {content.text}
        </div>
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
        expectedText={content.text || ""}
        audioSrc={content.audioUrl || question.audioUrl || ""}
        audioLabel="Listen carefully"
        autoStartDelay={5}
      />
    );
  }

  // ---- DESCRIBE IMAGE ----
  if (type === "DESCRIBE_IMAGE") {
    const imgSrc = content.imageUrl || question.imageUrl;
    return (
      <SpeakingQuestion
        instructionText="Look at the image carefully and describe it in detail. Mention the main elements, trends, or key data."
        prepTime={25}
        maxDuration={40}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
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
        prepTime={10}
        maxDuration={40}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
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
        prepTime={3}
        maxDuration={10}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
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
        prepTime={5}
        maxDuration={40}
        submitted={submitted}
        onSubmit={onSubmit}
        totalMarks={totalMarks}
        questionId={question.id}
        questionType={type}
        expectedText={content.text || ""}
        audioSrc={content.audioUrl || question.audioUrl || ""}
        audioLabel="Listen to the group discussion"
      />
    );
  }

  // ---- WRITE ESSAY ----
  if (type === "WRITE_ESSAY") {
    return (
      <WriteEssayQuestion
        question={question}
        content={content}
        totalMarks={totalMarks}
        submitted={submitted}
        onSubmit={onSubmit}
      />
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
      <SummarizeWrittenTextQuestion
        question={question}
        content={content}
        totalMarks={totalMarks}
        submitted={submitted}
        onSubmit={onSubmit}
      />
    );
  }

  // ---- MCQ SINGLE ----
  if (type === "READING_MCQ_SINGLE" || type === "LISTENING_MCQ_SINGLE") {
    const isListening = type === "LISTENING_MCQ_SINGLE";
    return (
      <div className="space-y-4">
        {isListening && (
          <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio" />
        )}
        {content.passage && (
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4 dark:bg-slate-800/50">
            <p className="text-sm leading-relaxed text-gray-800 dark:text-slate-200">{content.passage}</p>
          </div>
        )}
        <p className="font-medium text-gray-900 dark:text-slate-100">{content.question}</p>
        <div className="space-y-2">
          {content.options?.map((opt: string, i: number) => {
            const isSelected = response === i;
            const isCorrect = submitted && showFeedback && content.correctAnswers?.includes(i);
            const isWrong = submitted && showFeedback && isSelected && !isCorrect;

            return (
              <button
                key={i}
                onClick={() => !submitted && setResponse(i)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                  isCorrect ? "border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950/30" :
                  isWrong ? "border-red-500 bg-red-50 dark:border-red-700 dark:bg-red-950/30" :
                  isSelected ? "border-indigo-500 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/30" :
                  "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-slate-600 dark:hover:border-slate-500 dark:hover:bg-slate-700/40"
                }`}
                disabled={submitted}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                  isSelected || isCorrect ? "border-indigo-500 bg-indigo-600 text-white" : "border-gray-300 text-gray-500 dark:border-slate-500 dark:text-slate-400"
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {submitted && showFeedback && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {submitted && showFeedback && isWrong && <XCircle className="h-5 w-5 text-red-500" />}
              </button>
            );
          })}
        </div>
        {!submitted && (
          <Button
            onClick={() => {
              const correctIdx = content.correctAnswer ?? content.correctAnswers?.[0];
              const isCorrect = response === correctIdx;
              onSubmit({
                answer: response,
                scoreResult: {
                  marksEarned: isCorrect ? totalMarks : 0,
                  marksTotal: totalMarks,
                  correct: isCorrect ? 1 : 0,
                  total: 1,
                  mistakes: isCorrect ? [] : [{
                    position: 1,
                    yourAnswer: content.options?.[response] ?? "—",
                    correctAnswer: content.options?.[correctIdx] ?? "",
                  }],
                } as ScoreResult,
              });
            }}
            disabled={response === null}
          >
            Check Answer
          </Button>
        )}
      </div>
    );
  }

  // ---- MCQ MULTIPLE ----
  if (type === "READING_MCQ_MULTIPLE" || type === "LISTENING_MCQ_MULTIPLE") {
    const selected: number[] = response || [];
    const isListening = type === "LISTENING_MCQ_MULTIPLE";
    return (
      <div className="space-y-4">
        {isListening && (
          <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio" />
        )}
        {content.passage && (
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4 dark:bg-slate-800/50">
            <p className="text-sm leading-relaxed text-gray-800 dark:text-slate-200">{content.passage}</p>
          </div>
        )}
        <p className="font-medium text-gray-900 dark:text-slate-100">{content.question}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">Select all correct answers</p>
        <div className="space-y-2">
          {content.options?.map((opt: string, i: number) => {
            const isSelected = selected.includes(i);
            const isCorrect = submitted && showFeedback && content.correctAnswers?.includes(i);
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
                  isCorrect ? "border-green-500 bg-green-50 dark:border-green-700 dark:bg-green-950/30" :
                  isWrong ? "border-red-500 bg-red-50 dark:border-red-700 dark:bg-red-950/30" :
                  isSelected ? "border-indigo-500 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-950/30" :
                  "border-gray-200 hover:border-gray-300 dark:border-slate-600 dark:hover:border-slate-500"
                }`}
                disabled={submitted}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  isSelected ? "border-indigo-500 bg-indigo-600" : "border-gray-300 dark:border-slate-500"
                }`}>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
        {!submitted && (
          <Button
            onClick={() => {
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
                    ...wrongSelected.map((i: number) => ({
                      position: i + 1,
                      yourAnswer: content.options?.[i] ?? "—",
                      correctAnswer: "(Should not have selected this)",
                    })),
                    ...missed.map((i) => ({
                      position: i + 1,
                      yourAnswer: "(Missed)",
                      correctAnswer: content.options?.[i] ?? "",
                    })),
                  ],
                } as ScoreResult,
              });
            }}
            disabled={selected.length === 0}
          >
            Check Answers
          </Button>
        )}
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

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          Drag the paragraphs to arrange them in the correct order:
        </p>
        <ReorderDnD
          paragraphs={paragraphs}
          order={order}
          onReorder={setResponse}
          submitted={submitted}
          correctOrder={correctOrder}
          showFeedback={showFeedback}
        />
        {!submitted && (
          <Button onClick={() => {
            const mistakes: ScoreResult["mistakes"] = [];
            let correctCount = 0;
            order.forEach((paraIdx, pos) => {
              if (correctOrder[pos] === paraIdx) {
                correctCount++;
              } else {
                mistakes.push({
                  position: pos + 1,
                  yourAnswer: `Paragraph ${paraIdx + 1} placed at position ${pos + 1}`,
                  correctAnswer: `Paragraph ${correctOrder[pos] + 1} should be at position ${pos + 1}`,
                });
              }
            });
            const ratio = correctOrder.length > 0 ? correctCount / correctOrder.length : 0;
            onSubmit({
              order,
              scoreResult: {
                marksEarned: Math.round(totalMarks * ratio * 10) / 10,
                marksTotal: totalMarks,
                correct: correctCount,
                total: correctOrder.length,
                mistakes,
              } as ScoreResult,
            });
          }}>Check Order</Button>
        )}
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
    // Parse modelAnswer to get ordered correct answers (used when blanks data is a flat word list)
    const modelAnswers = (question.modelAnswer || "")
      .split(/[\n,]+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s && !/correct answers?/i.test(s) && !/model answer/i.test(s));
    return (
      <FillBlanksDrag
        passage={content.passage || ""}
        blanks={content.blanks || []}
        totalMarks={totalMarks}
        submitted={submitted}
        showAnswer={showAnswer}
        showFeedback={showFeedback}
        onSubmit={onSubmit}
        modelAnswers={modelAnswers}
        initialAnswers={Array.isArray(initialResponse) ? initialResponse : undefined}
      />
    );
  }

  // ---- READING FILL BLANKS (DROPDOWN) ----
  if (type === "READING_FILL_BLANKS_DROPDOWN") {
    return (
      <FillBlanksDropdown
        passage={content.passage || ""}
        blanks={content.blanks || []}
        options={content.options || content.blanks || []}
        totalMarks={totalMarks}
        submitted={submitted}
        showAnswer={showAnswer}
        showFeedback={showFeedback}
        onSubmit={onSubmit}
        initialAnswers={Array.isArray(initialResponse) ? initialResponse : undefined}
      />
    );
  }

  // ---- SUMMARIZE SPOKEN TEXT ----
  if (type === "SUMMARIZE_SPOKEN_TEXT") {
    return (
      <SummarizeSpokenTextQuestion
        question={question}
        content={content}
        totalMarks={totalMarks}
        submitted={submitted}
        onSubmit={onSubmit}
      />
    );
  }

  // ---- HIGHLIGHT CORRECT SUMMARY ----
  if (type === "HIGHLIGHT_CORRECT_SUMMARY") {
    return (
      <div className="space-y-4">
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio" />
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
        {!submitted && (
          <Button
            onClick={() => {
              const correctIdx = content.correctAnswer ?? content.correctAnswers?.[0];
              const isCorrect = response === correctIdx;
              onSubmit({
                answer: response,
                scoreResult: {
                  marksEarned: isCorrect ? totalMarks : 0,
                  marksTotal: totalMarks,
                  correct: isCorrect ? 1 : 0,
                  total: 1,
                  mistakes: isCorrect ? [] : [{
                    position: 1,
                    yourAnswer: content.options?.[response] ?? "—",
                    correctAnswer: content.options?.[correctIdx] ?? "",
                  }],
                } as ScoreResult,
              });
            }}
            disabled={response === null}
          >
            Check Answer
          </Button>
        )}
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

    return (
      <div className="space-y-4">
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen carefully and find the wrong words" />
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

        {!submitted && (
          <Button
            onClick={() => {
              const mistakes: ScoreResult["mistakes"] = [];
              let correctCount = 0;
              correctIncorrectIndices.forEach((idx) => {
                if (selectedSet.has(idx)) {
                  correctCount++;
                } else {
                  mistakes.push({
                    position: idx,
                    yourAnswer: "(not selected)",
                    correctAnswer: tokens[idx] || "",
                  });
                }
              });
              // Penalty for false positives (wrong selections)
              const falsePositives = selected.filter((i) => !correctSet.has(i));
              falsePositives.forEach((idx) => {
                mistakes.push({
                  position: idx,
                  yourAnswer: tokens[idx] || "",
                  correctAnswer: "(should not have selected this)",
                });
              });
              const totalCorrect = correctIncorrectIndices.length || 1;
              const netScore = Math.max(0, correctCount - falsePositives.length);
              const ratio = netScore / totalCorrect;
              onSubmit({
                answer: selected,
                scoreResult: {
                  marksEarned: Math.round(totalMarks * ratio * 10) / 10,
                  marksTotal: totalMarks,
                  correct: correctCount,
                  total: totalCorrect,
                  mistakes,
                } as ScoreResult,
              });
            }}
            disabled={selected.length === 0}
          >
            Check Answer
          </Button>
        )}
      </div>
    );
  }

  // ---- SELECT MISSING WORD ----
  if (type === "SELECT_MISSING_WORD") {
    return (
      <div className="space-y-4">
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen — last word is missing" />
        <p className="font-medium text-gray-900">Pick the word that completes the audio:</p>
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
        {!submitted && (
          <Button
            onClick={() => {
              const correctIdx = content.correctAnswer ?? content.correctAnswers?.[0];
              const isCorrect = response === correctIdx;
              onSubmit({
                answer: response,
                scoreResult: {
                  marksEarned: isCorrect ? totalMarks : 0,
                  marksTotal: totalMarks,
                  correct: isCorrect ? 1 : 0,
                  total: 1,
                  mistakes: isCorrect ? [] : [{
                    position: 1,
                    yourAnswer: content.options?.[response] ?? "—",
                    correctAnswer: content.options?.[correctIdx] ?? "",
                  }],
                } as ScoreResult,
              });
            }}
            disabled={response === null}
          >
            Check Answer
          </Button>
        )}
      </div>
    );
  }

  // ---- LISTENING FILL BLANKS ----
  if (type === "LISTENING_FILL_BLANKS") {
    return (
      <div className="space-y-4">
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio" />
        <p className="text-sm text-gray-500 dark:text-slate-400">Listen to the audio and fill in the blanks below:</p>
        <FillBlanksText
          passage={content.passage || ""}
          blanks={content.blanks || []}
          totalMarks={totalMarks}
          submitted={submitted}
          showAnswer={showAnswer}
          showFeedback={showFeedback}
          onSubmit={onSubmit}
          initialAnswers={Array.isArray(initialResponse) ? initialResponse : undefined}
        />
      </div>
    );
  }

  // ---- WRITE FROM DICTATION ----
  if (type === "WRITE_FROM_DICTATION") {
    return (
      <div className="space-y-4">
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen carefully — audio plays once" />
        <p className="text-sm text-gray-500 dark:text-slate-400">Listen to the audio and type the exact sentence you hear.</p>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="Type what you hear..."
          value={response || ""}
          onChange={(e) => setResponse(e.target.value)}
          disabled={submitted}
        />
        {submitted && showFeedback && content.correctText && (
          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/40">
            <p className="text-xs font-medium text-green-800 dark:text-green-300">Correct answer:</p>
            <p className="text-sm text-green-900 dark:text-green-200">{content.correctText}</p>
          </div>
        )}
        {!submitted && (
          <Button onClick={() => {
            const normalize = (s: string) =>
              s.trim().toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
            const studentWords = normalize(response || "");
            const correctWords = normalize(content.correctText || "");

            // LCS-based scoring: counts matched words accounting for skips/insertions
            const m = correctWords.length, n = studentWords.length;
            const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
            for (let i = 1; i <= m; i++) {
              for (let j = 1; j <= n; j++) {
                dp[i][j] = correctWords[i - 1] === studentWords[j - 1]
                  ? dp[i - 1][j - 1] + 1
                  : Math.max(dp[i - 1][j], dp[i][j - 1]);
              }
            }
            const matched = dp[m][n];

            // Backtrack LCS to find which correct words were missed
            const mistakes: ScoreResult["mistakes"] = [];
            let i = m, j = n;
            const missedPositions = new Set<number>();
            while (i > 0 && j > 0) {
              if (correctWords[i - 1] === studentWords[j - 1]) {
                i--; j--;
              } else if (dp[i - 1][j] >= dp[i][j - 1]) {
                missedPositions.add(i - 1);
                i--;
              } else {
                j--;
              }
            }
            while (i > 0) { missedPositions.add(i - 1); i--; }

            correctWords.forEach((w: string, idx: number) => {
              if (missedPositions.has(idx)) {
                mistakes.push({
                  position: idx + 1,
                  yourAnswer: "(missed or wrong)",
                  correctAnswer: w,
                });
              }
            });

            const ratio = m > 0 ? matched / m : 0;
            onSubmit({
              text: response,
              scoreResult: {
                marksEarned: Math.round(totalMarks * ratio * 10) / 10,
                marksTotal: totalMarks,
                correct: matched,
                total: m,
                mistakes,
              } as ScoreResult,
            });
          }} disabled={!response?.trim()}>
            Check Answer
          </Button>
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
}: {
  src: string;
  label?: string;
  onDuration?: (seconds: number) => void;
  onEnded?: () => void;
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

export function ScoreSummary({ result, lastAttemptScore }: { result: ScoreResult; lastAttemptScore: number | null }) {
  const percent = result.marksTotal > 0 ? (result.marksEarned / result.marksTotal) * 100 : 0;
  const isPerfect = result.marksEarned === result.marksTotal && result.marksTotal > 0;
  const isFailed = result.marksEarned === 0 && !result.pending;

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
        <p className="mt-3 rounded-md bg-white/70 p-2 text-xs text-gray-700">
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
  audioSrc, audioLabel, autoStartDelay = 0,
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
  autoStartDelay?: number;
}) {
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [promptAudioEnded, setPromptAudioEnded] = useState(false);
  const [showSpeakingTemplate, setShowSpeakingTemplate] = useState(false);

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
          onDuration={(sec) => setAudioDurationSec(sec)}
          onEnded={autoStartDelay > 0 ? () => setPromptAudioEnded(true) : undefined}
        />
      )}
      {children}

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
          autoStart={promptAudioEnded}
          autoStartDelay={autoStartDelay}
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
  question, content, totalMarks, submitted, onSubmit,
}: {
  question: QuestionData;
  content: any;
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
}) {
  const [text, setText] = useState("");
  const [scoring, setScoring] = useState(false);

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

  return (
    <div className="space-y-4">
      <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen to the audio carefully" />
      <p className="text-sm text-gray-500">Write a 50–70 word summary of what you heard in your own words.</p>
      <textarea
        className="min-h-[140px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        placeholder="Write your summary (50–70 words)..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted || scoring}
      />
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${withinRange ? "text-green-600" : currentWords === 0 ? "text-gray-400" : "text-amber-600"}`}>
          Words: {currentWords} / 50–70
        </span>
        {!submitted && (
          <Button onClick={handleSubmit} disabled={!text.trim() || scoring} loading={scoring}>
            {scoring ? "AI is scoring..." : "Submit Summary"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARIZE WRITTEN TEXT — AI scored on submit
// ============================================================================
function SummarizeWrittenTextQuestion({
  question, content, totalMarks, submitted, onSubmit,
}: {
  question: QuestionData;
  content: any;
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
}) {
  const [text, setText] = useState("");
  const [scoring, setScoring] = useState(false);

  const currentWords = text.trim().split(/\s+/).filter(Boolean).length;

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

  return (
    <div className="space-y-4">
      <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4">
        <p className="text-sm leading-relaxed text-gray-800">{content.passage}</p>
      </div>
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        placeholder="Write a one-sentence summary (5-75 words)..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted || scoring}
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">Words: {currentWords} / 75</span>
        {!submitted && (
          <Button onClick={handleSubmit} disabled={!text.trim() || scoring} loading={scoring}>
            {scoring ? "AI is scoring..." : "Submit Summary"}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WRITE ESSAY — AI scored on submit
// ============================================================================
function WriteEssayQuestion({
  question, content, totalMarks, submitted, onSubmit,
}: {
  question: QuestionData;
  content: any;
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
}) {
  const DRAFT_KEY = `essay_draft_${question.id}`;
  const [text, setText] = useState(() => {
    try { return localStorage.getItem(DRAFT_KEY) || ""; } catch { return ""; }
  });
  const [scoring, setScoring] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(0);

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
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
        {!submitted && (
          <Button onClick={handleSubmit} disabled={!text.trim() || scoring} loading={scoring}>
            {scoring ? "AI is scoring..." : "Submit Essay"}
          </Button>
        )}
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
  passage, blanks, submitted, showAnswer = false, showFeedback = true, onSubmit, totalMarks, modelAnswers = [], initialAnswers,
}: {
  passage: string;
  blanks: any[];
  totalMarks: number;
  submitted: boolean;
  showAnswer?: boolean;
  showFeedback?: boolean;
  onSubmit: (response: any) => void;
  modelAnswers?: string[];
  initialAnswers?: (string | null)[];
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
    if (useFlatMode) return flatWords;
    const hasPerBlankOptions = normalizedBlanks.some((b) => b.options && b.options.length > 0);
    if (hasPerBlankOptions) {
      const allOpts = new Set<string>();
      normalizedBlanks.forEach((b) => b.options.forEach((o: string) => allOpts.add(o)));
      return Array.from(allOpts);
    }
    return normalizedBlanks.map((b) => b.correctAnswer).filter(Boolean);
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

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        {submitted
          ? "Correct answers are shown in green. Wrong answers in red."
          : "Drag a word from the bank into a blank, or tap a word then tap a blank to place it."}
      </p>

      {/* Passage with blanks */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-base leading-loose text-gray-800">
        {segments.map((seg, i) => {
          if (BLANK_MARKER_REGEX.test(seg)) {
            blankIdx++;
            const thisIndex = blankIdx;
            const word = filled[thisIndex];
            const correct = normalizedBlanks[thisIndex]?.correctAnswer;
            const isCorrect =
              submitted && showFeedback && word && correct && word.toLowerCase() === correct.toLowerCase();
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
                className={`mx-1 inline-flex min-w-[100px] cursor-pointer items-center justify-center rounded-md border-2 border-dashed px-3 py-1 text-sm font-medium transition select-none ${
                  submitted && showFeedback
                    ? isCorrect
                      ? "border-green-500 bg-green-100 text-green-800"
                      : "border-red-400 bg-red-50 text-red-700"
                    : submitted
                      ? word
                        ? "border-gray-300 bg-gray-50 text-gray-700"
                        : "border-gray-200 bg-white text-gray-400"
                      : word
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 cursor-grab active:cursor-grabbing"
                        : selectedWord
                          ? "border-indigo-300 bg-indigo-50 text-gray-400 animate-pulse"
                          : "border-gray-300 bg-white text-gray-400 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
                title={word ? "Drag or tap to remove" : "Tap or drop a word here"}
              >
                {word || "drop here"}
                {submitted && showFeedback && isCorrect && <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />}
                {submitted && showFeedback && isWrong && <XCircle className="ml-1.5 h-3.5 w-3.5" />}
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
          <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Word Bank</p>
          <div
            className="flex flex-wrap gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-white p-4 min-h-[60px]"
            onDragOver={handleDragOver}
            onDrop={handleDropOnBank}
          >
            {bank.length === 0 ? (
              <p className="text-sm italic text-gray-400">All words placed. Drag or tap a blank to return a word.</p>
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
                      : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
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
      {((submitted && showFeedback) || showAnswer) && !useFlatMode && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase text-green-700">Correct Answers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedBlanks.map((b, i) => (
              <span key={i} className="rounded-md bg-white px-2 py-1 text-sm text-green-800 border border-green-200">
                <span className="mr-1 text-xs text-green-500">#{i + 1}</span>
                {b.correctAnswer}
              </span>
            ))}
          </div>
        </div>
      )}

      {!submitted && (
        <Button
          onClick={() => {
            if (useFlatMode) {
              const hasModelAnswers = modelAnswers.length >= blankCount;
              if (hasModelAnswers) {
                // Score properly using modelAnswers
                const mistakes: ScoreResult["mistakes"] = [];
                let correctCount = 0;
                normalizedBlanks.forEach((b, i) => {
                  const given = (filled[i] || "").trim().toLowerCase();
                  const expected = (b.correctAnswer || "").trim().toLowerCase();
                  if (expected && given === expected) {
                    correctCount++;
                  } else {
                    mistakes.push({
                      position: i + 1,
                      yourAnswer: (filled[i] || "").trim() || "(empty)",
                      correctAnswer: (b.correctAnswer || "").trim() || "—",
                    });
                  }
                });
                const ratio = blankCount > 0 ? correctCount / blankCount : 0;
                onSubmit({
                  answers: filled,
                  scoreResult: {
                    marksEarned: Math.round(totalMarks * ratio * 10) / 10,
                    marksTotal: totalMarks,
                    correct: correctCount,
                    total: blankCount,
                    mistakes,
                  } as ScoreResult,
                });
              } else {
                // No correct answer data — mark pending for teacher review
                onSubmit({
                  answers: filled,
                  scoreResult: {
                    marksEarned: 0,
                    marksTotal: totalMarks,
                    correct: 0,
                    total: blankCount,
                    mistakes: [],
                    pending: true,
                    message: "Submitted for teacher review. Add a model answer to enable auto-scoring.",
                  } as ScoreResult,
                });
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
                mistakes.push({
                  position: i + 1,
                  yourAnswer: given || "(empty)",
                  correctAnswer: correct,
                });
              }
            });
            const total = normalizedBlanks.length || 1;
            const ratio = correctCount / total;
            onSubmit({
              answers: filled,
              scoreResult: {
                marksEarned: Math.round(totalMarks * ratio * 10) / 10,
                marksTotal: totalMarks,
                correct: correctCount,
                total,
                mistakes,
              } as ScoreResult,
            });
          }}
          disabled={!allFilled}
        >
          Check Answers
        </Button>
      )}
    </div>
  );
}

// -------------------- DROPDOWN FILL BLANKS --------------------
function FillBlanksDropdown({
  passage, blanks, options, submitted, showAnswer = false, showFeedback = true, onSubmit, totalMarks, initialAnswers,
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

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        Pick the correct word from the dropdown for each blank.
      </p>

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-base leading-loose text-gray-800">
        {segments.map((seg, i) => {
          if (BLANK_MARKER_REGEX.test(seg)) {
            blankIdx++;
            const thisIndex = blankIdx;
            const value = answers[thisIndex];
            const blank = normalizedBlanks[thisIndex] || { correctAnswer: "", options: [] };
            const isCorrect =
              submitted && showFeedback && value && blank.correctAnswer &&
              value.trim().toLowerCase() === blank.correctAnswer.trim().toLowerCase();

            return (
              <select
                key={`blank-${i}`}
                value={value}
                onChange={(e) => {
                  const next = [...answers];
                  next[thisIndex] = e.target.value;
                  setAnswers(next);
                }}
                disabled={submitted}
                className={`mx-1 rounded-md border-2 px-2 py-1 text-sm font-medium transition ${
                  submitted && showFeedback
                    ? isCorrect
                      ? "border-green-500 bg-green-100 text-green-800"
                      : "border-red-400 bg-red-50 text-red-700"
                    : submitted
                      ? "border-gray-300 bg-gray-50 text-gray-700"
                    : value
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-gray-300 bg-white text-gray-500"
                }`}
              >
                <option value="">— choose —</option>
                {(blank.options || []).map((opt, j) => (
                  <option key={j} value={opt.trim()}>{opt.trim()}</option>
                ))}
              </select>
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
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase text-green-700">Correct Answers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedBlanks.map((b, i) => (
              <span key={i} className="rounded-md bg-white px-2 py-1 text-sm text-green-800 border border-green-200">
                <span className="mr-1 text-xs text-green-500">#{i + 1}</span>
                {b.correctAnswer}
              </span>
            ))}
          </div>
        </div>
      )}

      {!submitted && (
        <Button onClick={() => {
          const mistakes: ScoreResult["mistakes"] = [];
          let correctCount = 0;
          normalizedBlanks.forEach((b, i) => {
            const given = (answers[i] || "").trim();
            const correct = (b.correctAnswer || "").trim();
            if (given.toLowerCase() === correct.toLowerCase()) {
              correctCount++;
            } else {
              mistakes.push({
                position: i + 1,
                yourAnswer: given || "(empty)",
                correctAnswer: correct,
              });
            }
          });
          const total = normalizedBlanks.length || 1;
          const ratio = correctCount / total;
          onSubmit({
            answers,
            scoreResult: {
              marksEarned: Math.round(totalMarks * ratio * 10) / 10,
              marksTotal: totalMarks,
              correct: correctCount,
              total,
              mistakes,
            } as ScoreResult,
          });
        }} disabled={!allFilled}>
          Check Answers
        </Button>
      )}
    </div>
  );
}

// -------------------- TEXT INPUT FILL BLANKS (for Listening) --------------------
function FillBlanksText({
  passage, blanks, submitted, showAnswer = false, showFeedback = true, onSubmit, totalMarks, initialAnswers,
}: {
  passage: string;
  blanks: any[];
  totalMarks: number;
  submitted: boolean;
  showAnswer?: boolean;
  showFeedback?: boolean;
  onSubmit: (response: any) => void;
  initialAnswers?: string[];
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

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-base leading-loose text-gray-800">
        {segments.map((seg, i) => {
          if (BLANK_MARKER_REGEX.test(seg)) {
            blankIdx++;
            const thisIndex = blankIdx;
            const value = answers[thisIndex];
            const correct = normalizedBlanks[thisIndex]?.correctAnswer?.trim();
            const isCorrect =
              submitted && showFeedback && value && correct && value.trim().toLowerCase() === correct.toLowerCase();

            return (
              <input
                key={`blank-${i}`}
                type="text"
                value={value}
                onChange={(e) => {
                  const next = [...answers];
                  next[thisIndex] = e.target.value;
                  setAnswers(next);
                }}
                disabled={submitted}
                placeholder="..."
                className={`mx-1 inline-block w-32 rounded-md border-2 px-2 py-1 text-sm font-medium transition ${
                  submitted && showFeedback
                    ? isCorrect
                      ? "border-green-500 bg-green-100 text-green-800"
                      : "border-red-400 bg-red-50 text-red-700"
                    : submitted
                      ? "border-gray-300 bg-gray-50 text-gray-700"
                    : value
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-gray-300 bg-white text-gray-700"
                }`}
              />
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
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-semibold uppercase text-green-700">Correct Answers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedBlanks.map((b, i) => (
              <span key={i} className="rounded-md bg-white px-2 py-1 text-sm text-green-800 border border-green-200">
                <span className="mr-1 text-xs text-green-500">#{i + 1}</span>
                {b.correctAnswer}
              </span>
            ))}
          </div>
        </div>
      )}

      {!submitted && (
        <Button onClick={() => {
          const mistakes: ScoreResult["mistakes"] = [];
          let correctCount = 0;
          normalizedBlanks.forEach((b, i) => {
            const given = (answers[i] || "").trim();
            const correct = (b.correctAnswer || "").trim();
            if (given.toLowerCase() === correct.toLowerCase()) {
              correctCount++;
            } else {
              mistakes.push({
                position: i + 1,
                yourAnswer: given || "(empty)",
                correctAnswer: correct,
              });
            }
          });
          const total = normalizedBlanks.length || 1;
          const ratio = correctCount / total;
          onSubmit({
            answers,
            scoreResult: {
              marksEarned: Math.round(totalMarks * ratio * 10) / 10,
              marksTotal: totalMarks,
              correct: correctCount,
              total,
              mistakes,
            } as ScoreResult,
          });
        }} disabled={!allFilled}>
          Check Answers
        </Button>
      )}
    </div>
  );
}

