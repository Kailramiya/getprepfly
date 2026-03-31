"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, RotateCcw,
  CheckCircle2, XCircle, Loader2,
} from "lucide-react";

interface QuestionData {
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
}

export default function PracticeQuestionPage() {
  const params = useParams();
  const section = (params.section as string)?.toUpperCase();
  const type = (params.type as string)?.toUpperCase();

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<any>(null);
  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      const res = await fetch(`/api/questions?section=${section}&type=${type}&pageSize=50`);
      const data = await res.json();
      if (data.success && data.data.items.length > 0) {
        // Fetch full content for each question
        const fullQuestions = await Promise.all(
          data.data.items.map(async (q: any) => {
            const full = await fetch(`/api/questions/${q.id}`);
            const fullData = await full.json();
            return fullData.data;
          })
        );
        setQuestions(fullQuestions.filter(Boolean));
      }
      setLoading(false);
    };
    if (section && type) fetchQuestions();
  }, [section, type]);

  const goToNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSubmitted(false);
      setScore(null);
    }
  }, [currentIndex, questions.length]);

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSubmitted(false);
      setScore(null);
    }
  };

  const resetQuestion = () => {
    setSubmitted(false);
    setScore(null);
  };

  const formatType = (t: string) =>
    t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-lg text-gray-500">No questions available for this type yet.</p>
        <p className="mt-2 text-sm text-gray-400">Check back later or ask your centre admin to add questions.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{formatType(type)}</h1>
          <p className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentQuestion?.isPrediction && (
            <Badge variant="warning">Prediction</Badge>
          )}
          <Badge variant={
            currentQuestion?.difficulty === "EASY" ? "success" :
            currentQuestion?.difficulty === "HARD" ? "destructive" : "default"
          }>
            {currentQuestion?.difficulty}
          </Badge>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1">
        {questions.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${
              i === currentIndex
                ? "bg-indigo-600"
                : i < currentIndex
                ? "bg-indigo-200"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Question Content */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-base">{currentQuestion?.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Render based on question type */}
          <QuestionRenderer
            question={currentQuestion}
            submitted={submitted}
            onSubmit={(_response: any) => {
              setSubmitted(true);
              // For objective questions, calculate score locally
              if (["READING_MCQ_SINGLE", "READING_MCQ_MULTIPLE", "REORDER_PARAGRAPHS",
                   "READING_FILL_BLANKS_DRAG", "READING_FILL_BLANKS_DROPDOWN",
                   "LISTENING_MCQ_SINGLE", "LISTENING_MCQ_MULTIPLE",
                   "HIGHLIGHT_CORRECT_SUMMARY", "SELECT_MISSING_WORD",
                   "WRITE_FROM_DICTATION", "LISTENING_FILL_BLANKS",
                   "ANSWER_SHORT_QUESTION"].includes(type)) {
                // Local scoring for objective questions
                setScore({ local: true });
              }
            }}
            score={score}
          />
        </CardContent>
      </Card>

      {/* Model Answer (shown after submission) */}
      {submitted && currentQuestion?.modelAnswer && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Model Answer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-900 whitespace-pre-wrap">{currentQuestion.modelAnswer}</p>
          </CardContent>
        </Card>
      )}

      {/* Explanation */}
      {submitted && currentQuestion?.explanation && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-blue-800">Explanation:</p>
            <p className="mt-1 text-sm text-blue-700">{currentQuestion.explanation}</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goToPrev} disabled={currentIndex === 0} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <div className="flex gap-2">
          {submitted && (
            <Button variant="ghost" onClick={resetQuestion} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Retry
            </Button>
          )}
        </div>
        <Button
          onClick={goToNext}
          disabled={currentIndex === questions.length - 1}
          className="gap-2"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ==========================================================================
// Question Renderer — renders different UI based on question type
// ==========================================================================
function QuestionRenderer({
  question, submitted, onSubmit,
}: {
  question: QuestionData;
  submitted: boolean;
  onSubmit: (response: any) => void;
  score?: any;
}) {
  const [response, setResponse] = useState<any>(null);
  const content = question?.content as any;

  if (!question || !content) return null;

  const type = question.type;

  // ---- READ ALOUD ----
  if (type === "READ_ALOUD") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-amber-50 p-4 text-lg leading-relaxed text-gray-800">
          {content.text}
        </div>
        <p className="text-sm text-gray-500">
          Read the text above aloud. You have 30 seconds to prepare and 40 seconds to record.
        </p>
        {!submitted && (
          <Button onClick={() => onSubmit({ type: "audio" })} className="gap-2">
            Submit (Audio recording coming in Speaking module)
          </Button>
        )}
      </div>
    );
  }

  // ---- DESCRIBE IMAGE ----
  if (type === "DESCRIBE_IMAGE") {
    return (
      <div className="space-y-4">
        {(content.imageUrl || question.imageUrl) && (
          <div className="relative mx-auto h-80 w-full">
            <Image
              src={content.imageUrl || question.imageUrl}
              alt="Describe this image"
              fill
              className="rounded-lg border object-contain"
              unoptimized
            />
          </div>
        )}
        <p className="text-sm text-gray-500">
          Describe the image in detail. You have 25 seconds to prepare and 40 seconds to speak.
        </p>
        {!submitted && (
          <Button onClick={() => onSubmit({ type: "audio" })}>
            Submit
          </Button>
        )}
      </div>
    );
  }

  // ---- WRITE ESSAY ----
  if (type === "WRITE_ESSAY") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-gray-800">{content.prompt}</p>
        </div>
        <textarea
          className="min-h-[200px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder={`Write your essay here (${content.minWords || 200}-${content.maxWords || 300} words)...`}
          value={response || ""}
          onChange={(e) => setResponse(e.target.value)}
          disabled={submitted}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Words: {(response || "").trim().split(/\s+/).filter(Boolean).length}
          </span>
          {!submitted && (
            <Button onClick={() => onSubmit({ text: response })} disabled={!response?.trim()}>
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
      <div className="space-y-4">
        <div className="max-h-64 overflow-y-auto rounded-lg bg-gray-50 p-4">
          <p className="text-sm leading-relaxed text-gray-800">{content.passage}</p>
        </div>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder="Write a one-sentence summary (5-75 words)..."
          value={response || ""}
          onChange={(e) => setResponse(e.target.value)}
          disabled={submitted}
        />
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Words: {(response || "").trim().split(/\s+/).filter(Boolean).length} / 75
          </span>
          {!submitted && (
            <Button onClick={() => onSubmit({ text: response })} disabled={!response?.trim()}>
              Submit Summary
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ---- MCQ SINGLE ----
  if (type === "READING_MCQ_SINGLE" || type === "LISTENING_MCQ_SINGLE") {
    return (
      <div className="space-y-4">
        {content.passage && (
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4">
            <p className="text-sm leading-relaxed text-gray-800">{content.passage}</p>
          </div>
        )}
        <p className="font-medium text-gray-900">{content.question}</p>
        <div className="space-y-2">
          {content.options?.map((opt: string, i: number) => {
            const isSelected = response === i;
            const isCorrect = submitted && content.correctAnswers?.includes(i);
            const isWrong = submitted && isSelected && !isCorrect;

            return (
              <button
                key={i}
                onClick={() => !submitted && setResponse(i)}
                className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                  isCorrect ? "border-green-500 bg-green-50" :
                  isWrong ? "border-red-500 bg-red-50" :
                  isSelected ? "border-indigo-500 bg-indigo-50" :
                  "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                disabled={submitted}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                  isSelected || isCorrect ? "border-indigo-500 bg-indigo-600 text-white" : "border-gray-300 text-gray-500"
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {submitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {submitted && isWrong && <XCircle className="h-5 w-5 text-red-500" />}
              </button>
            );
          })}
        </div>
        {!submitted && (
          <Button onClick={() => onSubmit({ answer: response })} disabled={response === null}>
            Check Answer
          </Button>
        )}
      </div>
    );
  }

  // ---- MCQ MULTIPLE ----
  if (type === "READING_MCQ_MULTIPLE" || type === "LISTENING_MCQ_MULTIPLE") {
    const selected: number[] = response || [];
    return (
      <div className="space-y-4">
        {content.passage && (
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4">
            <p className="text-sm leading-relaxed text-gray-800">{content.passage}</p>
          </div>
        )}
        <p className="font-medium text-gray-900">{content.question}</p>
        <p className="text-xs text-gray-500">Select all correct answers</p>
        <div className="space-y-2">
          {content.options?.map((opt: string, i: number) => {
            const isSelected = selected.includes(i);
            const isCorrect = submitted && content.correctAnswers?.includes(i);
            const isWrong = submitted && isSelected && !isCorrect;

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
                  isCorrect ? "border-green-500 bg-green-50" :
                  isWrong ? "border-red-500 bg-red-50" :
                  isSelected ? "border-indigo-500 bg-indigo-50" :
                  "border-gray-200 hover:border-gray-300"
                }`}
                disabled={submitted}
              >
                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  isSelected ? "border-indigo-500 bg-indigo-600" : "border-gray-300"
                }`}>
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                </div>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
        {!submitted && (
          <Button onClick={() => onSubmit({ answers: selected })} disabled={selected.length === 0}>
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

    const moveUp = (idx: number) => {
      if (idx <= 0) return;
      const newOrder = [...order];
      [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
      setResponse(newOrder);
    };

    const moveDown = (idx: number) => {
      if (idx >= order.length - 1) return;
      const newOrder = [...order];
      [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
      setResponse(newOrder);
    };

    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Arrange the paragraphs in the correct order:</p>
        <div className="space-y-2">
          {order.map((paraIdx: number, position: number) => {
            const isCorrectPosition = submitted && content.correctOrder?.[position] === paraIdx;
            return (
              <div
                key={`${paraIdx}-${position}`}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  submitted
                    ? isCorrectPosition ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                    : "border-gray-200"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                  {position + 1}
                </span>
                <p className="flex-1 text-sm text-gray-800">{paragraphs[paraIdx]}</p>
                {!submitted && (
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveUp(position)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100">▲</button>
                    <button onClick={() => moveDown(position)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100">▼</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!submitted && (
          <Button onClick={() => onSubmit({ order })}>Check Order</Button>
        )}
      </div>
    );
  }

  // ---- WRITE FROM DICTATION ----
  if (type === "WRITE_FROM_DICTATION") {
    return (
      <div className="space-y-4">
        {(content.audioUrl || question.audioUrl) && (
          <audio controls className="w-full" src={content.audioUrl || question.audioUrl}>
            Your browser does not support audio.
          </audio>
        )}
        <p className="text-sm text-gray-500">Listen to the audio and type the exact sentence you hear.</p>
        <textarea
          className="min-h-[80px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          placeholder="Type what you hear..."
          value={response || ""}
          onChange={(e) => setResponse(e.target.value)}
          disabled={submitted}
        />
        {submitted && content.correctText && (
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-xs font-medium text-green-800">Correct answer:</p>
            <p className="text-sm text-green-900">{content.correctText}</p>
          </div>
        )}
        {!submitted && (
          <Button onClick={() => onSubmit({ text: response })} disabled={!response?.trim()}>
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
