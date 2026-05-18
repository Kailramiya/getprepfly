"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AudioRecorder } from "@/components/practice/audio-recorder";
import { AudioPlayerCustom } from "@/components/practice/audio-player-custom";
import {
  ChevronLeft, ChevronRight, RotateCcw,
  CheckCircle2, XCircle, Loader2, Volume2, List, X, Star,
  Flag, ThumbsUp, ThumbsDown, RefreshCw, Eye, EyeOff, BarChart2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

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
  marks?: number;
}

interface ScoreResult {
  marksEarned: number;
  marksTotal: number;
  correct: number;
  total: number;
  mistakes: Array<{ position: number; yourAnswer: string; correctAnswer: string }>;
  pending?: boolean; // for speaking/writing awaiting AI scoring
  message?: string;
}

export default function PracticeQuestionPage() {
  const params = useParams();
  const section = (params.section as string)?.toUpperCase();
  const type = (params.type as string)?.toUpperCase();

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [accessInfo, setAccessInfo] = useState<{ hasAllAccess: boolean; modules: string[]; isStaff: boolean } | null>(null);
  const [showList, setShowList] = useState(false);
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [attemptHistory, setAttemptHistory] = useState<Array<{ date: string; score: number }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const currentQuestion = questions[currentIndex];

  // Fetch user's access info to know if they actually have access to this section
  useEffect(() => {
    fetch("/api/access/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setAccessInfo({
            hasAllAccess: data.data.hasAllAccess,
            modules: data.data.modules || [],
            isStaff: !!data.data.isStaff,
          });
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  const saveAttempt = async (q: QuestionData, result: ScoreResult, response: any) => {
    try {
      await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: q.id,
          responseText: typeof response?.text === "string" ? response.text : null,
          scores: {
            correct: result.correct,
            total: result.total,
            marksEarned: result.marksEarned,
            marksTotal: result.marksTotal,
            mistakes: result.mistakes,
          },
          overallScore: result.marksTotal > 0
            ? Math.round((result.marksEarned / result.marksTotal) * 90)
            : 0,
        }),
      });
    } catch {
      // ignore — non-blocking
    }
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      // Single API call with full=1 returns content + audioUrl + imageUrl in one shot
      const res = await fetch(`/api/questions?section=${section}&type=${type}&all=1&full=1`);
      const data = await res.json();
      if (data.success && data.data.items.length > 0) {
        const items = data.data.items;
        setQuestions(items);
        // Fetch flags for all questions in one call
        const ids = items.map((q: QuestionData) => q.id).join(",");
        fetch(`/api/questions/flag?questionIds=${ids}`)
          .then(r => r.json())
          .then(d => { if (d.success) setFlags(d.data); })
          .catch(() => {});
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
    // Check if user has access to this section
    const hasSectionAccess =
      accessInfo?.hasAllAccess ||
      accessInfo?.modules.includes(section) ||
      section === "SPEAKING"; // speaking is always free to practice

    // Two distinct empty states:
    //   1. User has access but no questions exist yet → "no content yet"
    //   2. User doesn't have access → "upgrade to unlock"
    if (hasSectionAccess) {
      return (
        <div className="mx-auto max-w-2xl py-16">
          <Card className="border-gray-200">
            <CardContent className="p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <Loader2 className="h-8 w-8 text-gray-400" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-gray-900">No questions added yet</h2>
              <p className="mt-2 text-sm text-gray-600">
                {accessInfo?.isStaff
                  ? "You have full access — but no questions have been added to this section yet. Add some from the admin panel."
                  : "Your centre hasn't added questions for this type yet. Try a different question type or check back later."}
              </p>
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                {accessInfo?.isStaff && (
                  <a href="/super-admin/questions">
                    <Button className="gap-2">Add Questions</Button>
                  </a>
                )}
                <a href="/dashboard">
                  <Button variant="outline">Back to Dashboard</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // No access — show upgrade prompt
    return (
      <div className="mx-auto max-w-2xl py-16">
        <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-teal-50">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
              <Loader2 className="h-8 w-8 text-indigo-400" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-900">Module locked</h2>
            <p className="mt-2 text-sm text-gray-600">
              Upgrade to unlock the full question bank for this module.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a href="/pricing">
                <Button className="gap-2 bg-gradient-to-r from-indigo-600 to-purple-600">
                  Unlock {section.charAt(0) + section.slice(1).toLowerCase()} — ₹99
                </Button>
              </a>
              <a href="/dashboard">
                <Button variant="outline">Back to Dashboard</Button>
              </a>
            </div>
            <p className="mt-4 text-xs text-gray-500">
              Free users can practice publicly shared questions. Upgrade for the full question bank.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    if (!currentQuestion?.id) return;
    setShowAnswer(false);
    setAttemptHistory([]);
    setHistoryLoading(true);
    fetch(`/api/attempts?questionId=${currentQuestion.id}&pageSize=10`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const history = d.data.items
            .filter((a: any) => a.overallScore !== null)
            .map((a: any) => ({
              date: new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
              score: Math.round(a.overallScore),
            }))
            .reverse();
          setAttemptHistory(history);
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [currentQuestion?.id]);

  const jumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    setSubmitted(false);
    setScore(null);
    setShowList(false);
  };

  const setFlag = async (flag: string | null) => {
    if (!currentQuestion) return;
    const qid = currentQuestion.id;
    const prev = flags[qid];
    // Toggle off if same flag clicked again
    const next = prev === flag ? null : flag;
    setFlags(f => ({ ...f, [qid]: next as string }));
    await fetch("/api/questions/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: qid, flag: next }),
    });
  };

  const FLAG_OPTIONS = [
    { key: "WEAK", label: "Weak", icon: ThumbsDown, color: "text-red-600 bg-red-50 border-red-200 hover:bg-red-100" },
    { key: "REVIEW_AGAIN", label: "Review Again", icon: RefreshCw, color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100" },
    { key: "STRONG", label: "Strong", icon: ThumbsUp, color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100" },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Question List Overlay */}
      {showList && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowList(false)} />
          {/* Panel */}
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <p className="font-semibold text-gray-900">{formatType(type)}</p>
                <p className="text-xs text-gray-500">{questions.length} questions</p>
              </div>
              <button onClick={() => setShowList(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => jumpToQuestion(i)}
                  className={`w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-gray-50 ${i === currentIndex ? "bg-indigo-50 ring-1 ring-indigo-200" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i === currentIndex ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500"}`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{q.title}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${q.difficulty === "EASY" ? "bg-green-100 text-green-700" : q.difficulty === "HARD" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
                          {q.difficulty}
                        </span>
                        {q.isPrediction && <Star className="h-3 w-3 text-amber-500" />}
                        {flags[q.id] === "WEAK" && <ThumbsDown className="h-3 w-3 text-red-500" />}
                        {flags[q.id] === "REVIEW_AGAIN" && <RefreshCw className="h-3 w-3 text-amber-500" />}
                        {flags[q.id] === "STRONG" && <ThumbsUp className="h-3 w-3 text-green-500" />}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
          <Button variant="outline" size="sm" onClick={() => setShowList(true)} className="gap-1.5">
            <List className="h-4 w-4" /> All Questions
          </Button>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{currentQuestion?.title}</CardTitle>
            <button
              onClick={() => setShowAnswer(a => !a)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition"
            >
              {showAnswer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Render based on question type — key forces remount on question change so all
              local state (textarea, audio recording, MCQ selection, etc.) resets cleanly. */}
          <QuestionRenderer
            key={currentQuestion?.id}
            question={currentQuestion}
            submitted={submitted}
            onSubmit={(response: any) => {
              setSubmitted(true);
              const result = response?.scoreResult as ScoreResult | undefined;
              if (result) {
                setScore(result);
                saveAttempt(currentQuestion, result, response);
              }
            }}
            score={score}
          />

          {/* Score Summary (shown after submission) */}
          {submitted && score && (
            <div className="mt-6">
              <ScoreSummary result={score} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Answer — shown after submission OR when Show Answer is toggled */}
      {(submitted || showAnswer) && currentQuestion?.modelAnswer && (
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

      {/* Explanation — shown after submission OR when Show Answer is toggled */}
      {(submitted || showAnswer) && currentQuestion?.explanation && (
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

      {/* Score History */}
      {(attemptHistory.length > 0 || historyLoading) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-700">
              <BarChart2 className="h-4 w-4 text-indigo-500" />
              Your Score History
              <span className="ml-auto text-xs font-normal text-gray-400">{attemptHistory.length} attempt{attemptHistory.length !== 1 ? "s" : ""}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {historyLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={attemptHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 90]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number) => [`${v}/90`, "Score"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {attemptHistory.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.score >= 60 ? "#22c55e" : entry.score >= 30 ? "#f59e0b" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="mt-1 text-center text-xs text-gray-400">Green ≥ 60 · Amber ≥ 30 · Red &lt; 30</p>
          </CardContent>
        </Card>
      )}

      {/* Flag Buttons */}
      <div className="flex items-center justify-center gap-2 border-t pt-4">
        <Flag className="h-4 w-4 text-gray-400" />
        <span className="text-xs text-gray-400 mr-1">Mark as:</span>
        {FLAG_OPTIONS.map(({ key, label, icon: Icon, color }) => {
          const isActive = flags[currentQuestion?.id] === key;
          return (
            <button
              key={key}
              onClick={() => setFlag(key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${isActive ? color : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
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
        <div className="rounded-lg bg-amber-50 p-4 text-lg leading-relaxed text-gray-800">
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
        {submitted && content.text && (
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
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-base font-medium text-gray-800">
            {content.text}
          </div>
        )}
        {submitted && content.correctText && (
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
        <div className="rounded-lg bg-amber-50 p-4 text-base text-gray-800">
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
          <Button onClick={() => {
            const correctOrder: number[] = content.correctOrder || paragraphs.map((_: string, i: number) => i);
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
        onSubmit={onSubmit}
        modelAnswers={modelAnswers}
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
        onSubmit={onSubmit}
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
            const isCorrect = submitted && (content.correctAnswer === i || content.correctAnswers?.includes(i));
            const isWrong = submitted && isSelected && !isCorrect;
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
                {submitted && isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {submitted && isWrong && <XCircle className="h-5 w-5 text-red-500" />}
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
            if (submitted) {
              if (isSelected && isActuallyWrong) cls += " bg-green-500 font-semibold text-white"; // correct catch
              else if (isSelected && !isActuallyWrong) cls += " bg-red-500 font-semibold text-white line-through"; // wrong selection
              else if (!isSelected && isActuallyWrong) cls += " bg-amber-200 font-semibold text-amber-900 underline decoration-wavy"; // missed
              else cls += " text-gray-800";
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

        {submitted && (
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
            const isCorrect = submitted && (content.correctAnswer === i || content.correctAnswers?.includes(i));
            const isWrong = submitted && isSelected && !isCorrect;
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
        <p className="text-sm text-gray-500">Listen to the audio and fill in the blanks below:</p>
        <FillBlanksText
          passage={content.passage || ""}
          blanks={content.blanks || []}
          totalMarks={totalMarks}
          submitted={submitted}
          onSubmit={onSubmit}
        />
      </div>
    );
  }

  // ---- WRITE FROM DICTATION ----
  if (type === "WRITE_FROM_DICTATION") {
    return (
      <div className="space-y-4">
        <AudioBlock src={content.audioUrl || question.audioUrl || ""} label="Listen carefully — audio plays once" />
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

function AudioBlock({
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
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      {label && (
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
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

function ScoreSummary({ result }: { result: ScoreResult }) {
  const percent = result.marksTotal > 0 ? (result.marksEarned / result.marksTotal) * 100 : 0;
  const isPerfect = result.marksEarned === result.marksTotal && result.marksTotal > 0;
  const isFailed = result.marksEarned === 0 && !result.pending;

  const bgColor = result.pending
    ? "border-blue-200 bg-blue-50"
    : isPerfect
      ? "border-green-200 bg-green-50"
      : isFailed
        ? "border-red-200 bg-red-50"
        : "border-amber-200 bg-amber-50";

  const iconBg = result.pending
    ? "bg-blue-100 text-blue-600"
    : isPerfect
      ? "bg-green-100 text-green-600"
      : isFailed
        ? "bg-red-100 text-red-600"
        : "bg-amber-100 text-amber-600";

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
          <h3 className="text-lg font-bold text-gray-900">
            {result.pending
              ? "Submitted — awaiting review"
              : isPerfect
                ? "Perfect score! 🎉"
                : isFailed
                  ? "No marks earned"
                  : "Partial credit"}
          </h3>
          {!result.pending && (
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {result.marksEarned}
              </span>
              <span className="text-sm text-gray-500">/ {result.marksTotal} marks</span>
              <span className="ml-2 text-sm font-medium text-gray-600">
                ({Math.round(percent)}%)
              </span>
            </div>
          )}
          {result.pending && result.message && (
            <p className="mt-1 text-sm text-blue-800">{result.message}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!result.pending && (
        <div className="mt-4 h-2 w-full rounded-full bg-white">
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
          <span className="text-gray-700">
            {result.correct} of {result.total} correct
          </span>
        </div>
      )}

      {/* Mistakes */}
      {result.mistakes.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-600">
            Mistakes to review ({result.mistakes.length})
          </p>
          <div className="space-y-2">
            {result.mistakes.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-red-200 bg-white p-3 text-sm"
              >
                {m.position > 0 && (
                  <p className="mb-1 text-xs font-medium text-gray-500">
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
            message: `${scores.feedback || ""} | Transcribed: "${transcription}"`,
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

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-medium text-amber-800">
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
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
          <p className="mb-2 text-xs font-medium text-indigo-800">Your recording:</p>
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
  const [text, setText] = useState("");
  const [scoring, setScoring] = useState(false);

  const minW = content.minWords || 200;
  const maxW = content.maxWords || 300;
  const currentWords = text.trim().split(/\s+/).filter(Boolean).length;
  const withinRange = currentWords >= minW && currentWords <= maxW;

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
          message: withinRange
            ? "Essay saved for teacher review."
            : "Essay saved with word count issues. See notes above.",
        } as ScoreResult,
      });
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <p className="text-gray-800">{content.prompt}</p>
      </div>
      <textarea
        className="min-h-[200px] w-full rounded-lg border border-gray-300 p-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        placeholder={`Write your essay here (${minW}–${maxW} words)...`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={submitted || scoring}
      />
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${
          currentWords === 0 ? "text-gray-400" :
          withinRange ? "text-green-600" : "text-amber-600"
        }`}>
          {currentWords} / {minW}–{maxW} words
        </span>
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
  passage, blanks, submitted, onSubmit, totalMarks, modelAnswers = [],
}: {
  passage: string;
  blanks: any[];
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
  modelAnswers?: string[];
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

  const [filled, setFilled] = useState<(string | null)[]>(
    Array(Math.max(blankCount, normalizedBlanks.length)).fill(null)
  );
  const [bank, setBank] = useState<string[]>(() => shuffle(wordBank));
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
              submitted && word && correct && word.toLowerCase() === correct.toLowerCase();
            const isWrong =
              submitted && (!word || (correct && word.toLowerCase() !== correct.toLowerCase()));

            return (
              <span
                key={`blank-${i}`}
                draggable={!submitted && !!word}
                onDragStart={() => word && handleBlankDragStart(word, thisIndex)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropOnBlank(e, thisIndex)}
                onClick={() => handleBlankClick(thisIndex)}
                className={`mx-1 inline-flex min-w-[100px] cursor-pointer items-center justify-center rounded-md border-2 border-dashed px-3 py-1 text-sm font-medium transition select-none ${
                  submitted
                    ? isCorrect
                      ? "border-green-500 bg-green-100 text-green-800"
                      : "border-red-400 bg-red-50 text-red-700"
                    : word
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700 cursor-grab active:cursor-grabbing"
                      : selectedWord
                        ? "border-indigo-300 bg-indigo-50 text-gray-400 animate-pulse"
                        : "border-gray-300 bg-white text-gray-400 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
                title={word ? "Drag or tap to remove" : "Tap or drop a word here"}
              >
                {word || "drop here"}
                {submitted && isCorrect && <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />}
                {submitted && isWrong && <XCircle className="ml-1.5 h-3.5 w-3.5" />}
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

      {/* Correct Answers (after submit) */}
      {submitted && !useFlatMode && (
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
                  const given = (filled[i] || "").toLowerCase();
                  const expected = (b.correctAnswer || "").toLowerCase();
                  if (expected && given === expected) {
                    correctCount++;
                  } else {
                    mistakes.push({
                      position: i + 1,
                      yourAnswer: filled[i] || "(empty)",
                      correctAnswer: b.correctAnswer || "—",
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
              const given = filled[i] || "";
              if (given.toLowerCase() === (b.correctAnswer || "").toLowerCase()) {
                correctCount++;
              } else {
                mistakes.push({
                  position: i + 1,
                  yourAnswer: given || "(empty)",
                  correctAnswer: b.correctAnswer,
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
  passage, blanks, options, submitted, onSubmit, totalMarks,
}: {
  passage: string;
  blanks: any[];
  options: string[];
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
}) {
  const segments = splitPassage(passage);
  const normalizedBlanks = blanks.map((b) => normalizeBlank(b, options));
  const blankCount = segments.filter((s) => BLANK_MARKER_REGEX.test(s)).length;
  const [answers, setAnswers] = useState<string[]>(
    Array(Math.max(blankCount, normalizedBlanks.length)).fill("")
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
              submitted && value && blank.correctAnswer &&
              value.toLowerCase() === blank.correctAnswer.toLowerCase();

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
                  submitted
                    ? isCorrect
                      ? "border-green-500 bg-green-100 text-green-800"
                      : "border-red-400 bg-red-50 text-red-700"
                    : value
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-gray-300 bg-white text-gray-500"
                }`}
              >
                <option value="">— choose —</option>
                {(blank.options || []).map((opt, j) => (
                  <option key={j} value={opt}>{opt}</option>
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

      {submitted && (
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
            if (given.toLowerCase() === (b.correctAnswer || "").toLowerCase()) {
              correctCount++;
            } else {
              mistakes.push({
                position: i + 1,
                yourAnswer: given || "(empty)",
                correctAnswer: b.correctAnswer,
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
  passage, blanks, submitted, onSubmit, totalMarks,
}: {
  passage: string;
  blanks: any[];
  totalMarks: number;
  submitted: boolean;
  onSubmit: (response: any) => void;
}) {
  const segments = splitPassage(passage);
  const normalizedBlanks = blanks.map((b) => normalizeBlank(b, []));
  const blankCount = segments.filter((s) => BLANK_MARKER_REGEX.test(s)).length;
  const [answers, setAnswers] = useState<string[]>(
    Array(Math.max(blankCount, normalizedBlanks.length)).fill("")
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
            const correct = normalizedBlanks[thisIndex]?.correctAnswer;
            const isCorrect =
              submitted && value && correct && value.trim().toLowerCase() === correct.toLowerCase();

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
                  submitted
                    ? isCorrect
                      ? "border-green-500 bg-green-100 text-green-800"
                      : "border-red-400 bg-red-50 text-red-700"
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

      {submitted && (
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
            if (given.toLowerCase() === (b.correctAnswer || "").toLowerCase()) {
              correctCount++;
            } else {
              mistakes.push({
                position: i + 1,
                yourAnswer: given || "(empty)",
                correctAnswer: b.correctAnswer,
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
