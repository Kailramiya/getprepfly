"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Loader2, Volume2, CheckCircle2, XCircle,
  Mic, PenTool, BookOpen, Headphones, Clock, BarChart3,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Scores {
  correct?: number;
  total?: number;
  marksEarned?: number;
  marksTotal?: number;
  mistakes?: Array<{ position: number; yourAnswer: string; correctAnswer: string }>;
  aiScores?: { pronunciation?: number; fluency?: number; content?: number; overall?: number;
               grammar?: number; spelling?: number; structure?: number };
  transcription?: string;
}

interface Attempt {
  id: string;
  createdAt: string;
  overallScore: number | null;
  timeTaken: number | null;
  responseText: string | null;
  responseAudio: string | null;
  feedback: string | null;
  scores: Scores | null;
  question: {
    id: string;
    type: string;
    section: string;
    title: string;
    difficulty: string;
    content: any;
    modelAnswer: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
    explanation: string | null;
  };
}

interface HistoryEntry {
  id: string;
  overallScore: number | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SECTION_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  SPEAKING:  { icon: Mic,        color: "text-teal-600",   bg: "bg-teal-100",   label: "Speaking" },
  WRITING:   { icon: PenTool,    color: "text-blue-600",   bg: "bg-blue-100",   label: "Writing" },
  READING:   { icon: BookOpen,   color: "text-purple-600", bg: "bg-purple-100", label: "Reading" },
  LISTENING: { icon: Headphones, color: "text-orange-600", bg: "bg-orange-100", label: "Listening" },
};

function pteBand(score: number) {
  if (score >= 79) return { label: "Expert", color: "text-green-600" };
  if (score >= 65) return { label: "Advanced", color: "text-blue-600" };
  if (score >= 50) return { label: "Competent", color: "text-amber-600" };
  if (score >= 36) return { label: "Intermediate", color: "text-orange-600" };
  return { label: "Limited", color: "text-red-600" };
}

function formatDuration(secs: number | null) {
  if (!secs) return null;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatType(t: string) {
  return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Score bar + band */
function ScoreBlock({ score, label }: { score: number; label: string }) {
  const band = pteBand(score);
  const barColor =
    score >= 79 ? "bg-green-500" : score >= 65 ? "bg-blue-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-gray-900 dark:text-slate-100">{score}</span>
        <span className="mb-1 text-sm text-gray-400 dark:text-slate-500">/90 — {label}</span>
        <span className={`mb-1 text-sm font-semibold ${band.color}`}>{band.label}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min((score / 90) * 100, 100)}%` }} />
      </div>
    </div>
  );
}

/** AI sub-scores grid for speaking / writing */
function SubScores({ aiScores }: { aiScores: Scores["aiScores"] }) {
  if (!aiScores) return null;
  const entries = Object.entries(aiScores).filter(([k, v]) => k !== "overall" && v !== undefined);
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {entries.map(([key, val]) => (
        <div key={key} className="rounded-lg border border-gray-200 dark:border-slate-700 p-2 text-center">
          <p className="text-xs capitalize text-gray-500 dark:text-slate-400">{key}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{val ?? "—"}</p>
        </div>
      ))}
    </div>
  );
}

/** Word-diff for READ_ALOUD / REPEAT_SENTENCE / DICTATION */
function WordDiff({ text, mistakes }: { text: string; mistakes: Scores["mistakes"] }) {
  if (!text) return null;
  const words = text.split(/\s+/);
  const missedPositions = new Map<number, string>();
  (mistakes || []).forEach(m => missedPositions.set(m.position - 1, m.yourAnswer));

  return (
    <div className="flex flex-wrap gap-1 leading-7">
      {words.map((word, i) => {
        const clean = word.replace(/[^\w'-]/g, "");
        const yourWord = missedPositions.get(i);
        if (yourWord !== undefined) {
          return (
            <span key={i} className="relative group cursor-default">
              <span className="rounded bg-red-100 px-1 text-red-700 line-through dark:bg-red-900/40 dark:text-red-400">{word}</span>
              {yourWord && yourWord !== "(missed)" && (
                <span className="ml-0.5 rounded bg-amber-100 px-1 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">{yourWord}</span>
              )}
              {yourWord === "(missed)" && (
                <span className="ml-0.5 rounded bg-gray-100 px-1 text-xs text-gray-400 dark:bg-slate-700 dark:text-slate-500">(missed)</span>
              )}
            </span>
          );
        }
        return (
          <span key={i} className={clean ? "rounded bg-green-50 px-1 text-green-800 dark:bg-green-950/40 dark:text-green-300" : ""}>
            {word}
          </span>
        );
      })}
    </div>
  );
}

/** Inline TTS player for model answer */
function ModelAudioButton({ text }: { text: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  const load = async () => {
    if (url || loading) return;
    setLoading(true);
    setErr(false);
    try {
      const res = await fetch("/api/ai/tts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) { setErr(true); return; }
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      urlRef.current = objUrl;
      setUrl(objUrl);
    } catch { setErr(true); }
    finally { setLoading(false); }
  };

  if (url) return <audio controls src={url} className="w-full" />;

  return (
    <div className="space-y-1.5">
      <button
        onClick={load}
        disabled={loading}
        className="flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</> : <><Volume2 className="h-3.5 w-3.5" /> Listen to model answer</>}
      </button>
      {err && <p className="text-xs text-red-500">Could not generate audio. Try again.</p>}
    </div>
  );
}

/** History sparkline (simple dots + line) */
function HistoryChart({ current, history }: { current: number; history: HistoryEntry[] }) {
  const all = [
    ...history.map(h => ({ score: Math.round(h.overallScore!), date: h.createdAt, isCurrent: false })),
    { score: current, date: new Date().toISOString(), isCurrent: true },
  ];
  if (all.length < 2) return null;
  const max = Math.max(...all.map(p => p.score), 90);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 dark:text-slate-400">Your score history on this question</p>
      <div className="flex items-end gap-2 h-16">
        {all.map((p, i) => {
          const barH = Math.round((p.score / max) * 64);
          const color = p.isCurrent ? "bg-indigo-500" : p.score >= 65 ? "bg-green-400" : "bg-amber-400";
          return (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1">
              <span className="text-xs font-semibold text-gray-700 dark:text-slate-300">{p.score}</span>
              <div className={`w-full rounded-t ${color}`} style={{ height: barH }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {all.map((p, i) => (
          <p key={i} className={`flex-1 text-center text-[10px] ${p.isCurrent ? "font-bold text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-slate-500"}`}>
            {p.isCurrent ? "Now" : new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Extract a readable text prompt from question content based on type */
function QuestionContentBlock({ question }: { question: Attempt["question"] }) {
  const { type, content, audioUrl, imageUrl } = question;
  const c = content || {};

  // Speaking
  if (type === "READ_ALOUD") {
    return (
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 text-base leading-relaxed text-gray-800 dark:text-slate-200">
        {c.text}
      </div>
    );
  }
  if (type === "REPEAT_SENTENCE" || type === "RETELL_LECTURE" || type === "SUMMARIZE_SPOKEN_TEXT") {
    const src = c.audioUrl || audioUrl;
    return src ? (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 dark:text-slate-400">Audio prompt</p>
        <audio controls src={src} className="w-full" />
      </div>
    ) : <p className="text-xs text-gray-400">Audio prompt not available</p>;
  }
  if (type === "DESCRIBE_IMAGE") {
    const src = c.imageUrl || imageUrl;
    return src ? (
      <div className="relative mx-auto h-60 w-full">
        <Image src={src} alt="Question image" fill className="rounded-lg border object-contain" unoptimized />
      </div>
    ) : null;
  }
  if (type === "ANSWER_SHORT_QUESTION") {
    return (
      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-4 font-medium text-gray-800 dark:text-slate-200">
        {c.text}
      </div>
    );
  }

  // Writing
  if (type === "WRITE_ESSAY" || type === "RESPOND_TO_SITUATION") {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-4 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Prompt</p>
        {c.prompt || c.text}
      </div>
    );
  }
  if (type === "SUMMARIZE_WRITTEN_TEXT") {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-4 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">Passage</p>
        {c.text}
      </div>
    );
  }

  // Reading / Listening MCQ
  if (type?.includes("MCQ") || type === "HIGHLIGHT_CORRECT_SUMMARY") {
    return (
      <div className="space-y-3">
        {c.passage && (
          <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-4 text-sm leading-relaxed text-gray-700 dark:text-slate-300">{c.passage}</div>
        )}
        {c.question && <p className="font-medium text-gray-800 dark:text-slate-200">{c.question}</p>}
        {Array.isArray(c.options) && (
          <div className="space-y-1.5">
            {c.options.map((opt: string, i: number) => {
              const isCorrect = c.correctAnswer === i || (Array.isArray(c.correctAnswer) && c.correctAnswer.includes(i));
              return (
                <div key={i} className={`flex items-center gap-2 rounded p-2 text-sm ${isCorrect ? "bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300" : "text-gray-700 dark:text-slate-300"}`}>
                  {isCorrect ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> : <XCircle className="h-4 w-4 shrink-0 text-gray-300 dark:text-slate-600" />}
                  {opt}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Dictation
  if (type === "DICTATION" || type === "WRITE_FROM_DICTATION") {
    const src = c.audioUrl || audioUrl;
    return src ? (
      <div className="space-y-2">
        <p className="text-xs text-gray-500 dark:text-slate-400">Dictation audio</p>
        <audio controls src={src} className="w-full" />
        {c.text && <p className="text-xs text-gray-400 dark:text-slate-500">Sentence: {c.text}</p>}
      </div>
    ) : null;
  }

  // Fill blanks
  if (type?.includes("FILL_BLANK") || type === "READING_FILL_BLANKS" || type === "WRITING_FILL_BLANKS" || type === "LISTENING_FILL_BLANKS") {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-4 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        {c.passage || c.text}
      </div>
    );
  }

  // Generic fallback
  if (c.text || c.passage || c.prompt) {
    return (
      <div className="rounded-lg bg-gray-50 dark:bg-slate-800 p-4 text-sm leading-relaxed text-gray-700 dark:text-slate-300">
        {c.text || c.passage || c.prompt}
      </div>
    );
  }

  return null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AttemptReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [data, setData] = useState<{ attempt: Attempt; history: HistoryEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/attempts/${attemptId}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 dark:text-slate-400">Could not load this attempt.</p>
        <Link href="/progress" className="mt-4 inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Progress
        </Link>
      </div>
    );
  }

  const { attempt, history } = data;
  const { question, scores } = attempt;
  const section = SECTION_CONFIG[question.section];
  const SectionIcon = section?.icon || BarChart3;
  const overallScore = attempt.overallScore !== null ? Math.round(attempt.overallScore) : null;
  const isSpeaking = question.section === "SPEAKING";
  const hasWordDiff = (question.type === "READ_ALOUD" || question.type === "REPEAT_SENTENCE" || question.type === "WRITE_FROM_DICTATION" || question.type === "DICTATION") && scores?.mistakes && scores.mistakes.length > 0;
  const expectedText = question.content?.text || question.content?.correctText || "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Link href="/progress" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
        <ArrowLeft className="h-4 w-4" /> Back to Progress
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${section?.bg || "bg-gray-100"} ${section?.color || "text-gray-600"}`}>
            <SectionIcon className="h-3.5 w-3.5" /> {section?.label || question.section}
          </span>
          <Badge variant="outline" className="text-xs">{formatType(question.type)}</Badge>
          <Badge variant="outline" className="text-xs capitalize">{question.difficulty.toLowerCase()}</Badge>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">{question.title}</h1>
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-slate-500">
          <span>{new Date(attempt.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
          {formatDuration(attempt.timeTaken) && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDuration(attempt.timeTaken)}</span>
          )}
        </div>
      </div>

      {/* Score */}
      {overallScore !== null && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <ScoreBlock score={overallScore} label={`${question.section.charAt(0) + question.section.slice(1).toLowerCase()} score`} />
            {scores?.aiScores && <SubScores aiScores={scores.aiScores} />}
          </CardContent>
        </Card>
      )}

      {/* Question Content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-600 dark:text-slate-400">Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <QuestionContentBlock question={question} />
        </CardContent>
      </Card>

      {/* Your Response */}
      {(attempt.responseText || scores?.transcription) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-slate-400">Your Response</CardTitle>
          </CardHeader>
          <CardContent>
            {attempt.responseText && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-slate-200">{attempt.responseText}</p>
            )}
            {!attempt.responseText && scores?.transcription && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-slate-200">
                <span className="text-xs font-medium text-gray-400 dark:text-slate-500 block mb-1">What you said (transcribed):</span>
                {scores.transcription}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Word diff (speaking read-aloud / dictation) */}
      {hasWordDiff && expectedText && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-600 dark:text-slate-400">Word-by-word comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-100 inline-block" /> Correct</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-100 inline-block" /> Expected word (missed/wrong)</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-100 inline-block" /> What you said</span>
            </div>
            <WordDiff text={expectedText} mistakes={scores?.mistakes} />
          </CardContent>
        </Card>
      )}

      {/* AI Feedback */}
      {attempt.feedback && (
        <Card className="border-indigo-200 dark:border-indigo-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">AI Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-gray-700 dark:text-slate-300">{attempt.feedback}</p>
          </CardContent>
        </Card>
      )}

      {/* Model Answer */}
      {(question.modelAnswer || question.explanation || (isSpeaking && expectedText)) && (
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Model Answer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {question.modelAnswer && (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-slate-200">{question.modelAnswer}</p>
            )}
            {!question.modelAnswer && question.type === "READ_ALOUD" && expectedText && (
              <p className="text-sm text-gray-500 dark:text-slate-400">Read the passage clearly and at a natural pace.</p>
            )}
            {question.explanation && (
              <p className="text-sm text-gray-600 dark:text-slate-400 italic">{question.explanation}</p>
            )}
            {/* TTS listen button for READ_ALOUD */}
            {question.type === "READ_ALOUD" && expectedText && (
              <ModelAudioButton text={expectedText} />
            )}
            {/* Replay audio for REPEAT_SENTENCE */}
            {question.type === "REPEAT_SENTENCE" && (question.content?.audioUrl || question.audioUrl) && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500 dark:text-slate-400">Replay the sentence:</p>
                <audio controls src={question.content?.audioUrl || question.audioUrl || ""} className="w-full" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attempt history on this question */}
      {history.length > 0 && overallScore !== null && (
        <Card>
          <CardContent className="p-4">
            <HistoryChart current={overallScore} history={history} />
          </CardContent>
        </Card>
      )}

      {/* Pending / unscored state */}
      {overallScore === null && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardContent className="p-4 text-center text-sm text-amber-700 dark:text-amber-400">
            This attempt is pending AI scoring or teacher review.
          </CardContent>
        </Card>
      )}

      {/* Practice again */}
      <div className="text-center">
        <Link
          href={`/practice/${question.section.toLowerCase()}/${question.type.toLowerCase()}`}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Practice {formatType(question.type)} again
        </Link>
      </div>
    </div>
  );
}
