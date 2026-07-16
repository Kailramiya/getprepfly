"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, RotateCcw,
  CheckCircle2, Loader2, List, X, Star,
  Flag, ThumbsUp, ThumbsDown, RefreshCw, Eye, EyeOff, BarChart2, AlertTriangle,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  QuestionRenderer, ScoreSummary,
  QuestionData, ScoreResult,
} from "@/components/practice/question-renderer";

type PracticeQuestionData = QuestionData & {
  source?: "MY_CENTRE" | "PUBLIC";
};

export default function PracticeQuestionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const section = (params.section as string)?.toUpperCase();
  const type = (params.type as string)?.toUpperCase().replace(/-/g, "_");
  const isPrediction = searchParams?.get("prediction") === "true";

  const [questions, setQuestions] = useState<PracticeQuestionData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [questionPage, setQuestionPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [accessInfo, setAccessInfo] = useState<{ hasAllAccess: boolean; modules: string[]; isStaff: boolean; centreId: string | null } | null>(null);
  const [showList, setShowList] = useState(false);
  const [flags, setFlags] = useState<Record<string, string>>({});
  const [showAnswer, setShowAnswer] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportSubmitting, setReportSubmittreing] = useState(false);
  const [reportDone, setReportDone] = useState<Set<string>>(() => new Set());
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<"all" | "my-centre" | "public">("all");
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [lastAttemptScore, setLastAttemptScore] = useState<number | null>(null);
  const [attemptHistory, setAttemptHistory] = useState<Array<{ date: string; score: number }>>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const currentQuestion = questions[currentIndex];
  const autoSubmitRef = useRef<(() => void) | null>(null);
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

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
            centreId: data.data.centreId || null,
          });
        }
      })
      .catch(() => { /* ignore */ });
  }, []);

  // Types scored server-side via POST /api/questions/:id/score — attempt already saved there
  const SERVER_SCORED_TYPES = new Set([
    "READING_MCQ_SINGLE", "READING_MCQ_MULTIPLE",
    "LISTENING_MCQ_SINGLE", "LISTENING_MCQ_MULTIPLE",
    "REORDER_PARAGRAPHS", "HIGHLIGHT_INCORRECT_WORDS",
    "SELECT_MISSING_WORD", "WRITE_FROM_DICTATION",
    "LISTENING_FILL_BLANKS",
  ]);

  const saveAttempt = async (q: QuestionData, result: ScoreResult, response: any) => {
    if (SERVER_SCORED_TYPES.has(q.type)) return; // already saved by score endpoint
    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
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
            ...(result.aiScores && { aiScores: result.aiScores }),
            ...(result.transcription && { transcription: result.transcription }),
          },
          overallScore: result.marksTotal > 0
            ? Math.round((result.marksEarned / result.marksTotal) * 90)
            : 0,
          rawPointsEarned: result.marksEarned,
          maxPointsPossible: result.marksTotal,
          timeTaken,
          feedback: result.message || null,
        }),
      });
    } catch {
      // ignore — non-blocking
    }
  };

  const fetchQuestionPage = useCallback(async (page: number, replace = false) => {
    const pageSize = 20;
    if (replace) setLoading(true);
    else setLoadingMore(true);

    try {
      const sourceParam = selectedSource !== "all" ? `&source=${selectedSource}` : "";
      const predictionParam = isPrediction ? "&prediction=true" : "";
      const res = await fetch(`/api/questions?section=${section}&type=${type}&page=${page}&pageSize=${pageSize}${sourceParam}${predictionParam}`);
      const data = await res.json();
      if (data.success) {
        const items = data.data.items as PracticeQuestionData[];
        setTotalQuestions(data.data.total || items.length);
        setQuestionPage(page);
        setQuestions(prev => replace ? items : [...prev, ...items]);

        const ids = items.map((q) => q.id).join(",");
        if (ids) {
          fetch(`/api/questions/flag?questionIds=${ids}`)
            .then(r => r.json())
            .then(d => { if (d.success) setFlags(prev => ({ ...prev, ...d.data })); })
            .catch(() => { });
        }

        return items.length > 0;
      }
    } catch {
      // Keep the currently loaded page usable if pagination fails.
    } finally {
      if (replace) setLoading(false);
      else setLoadingMore(false);
    }
    return false;
  }, [section, type, selectedSource, isPrediction]);

  useEffect(() => {
    if (!section || !type) return;
    setQuestions([]);
    setCurrentIndex(0);
    setTotalQuestions(0);
    setQuestionPage(1);
    setFlags({});
    fetchQuestionPage(1, true);
  }, [section, type, selectedSource, fetchQuestionPage]);

  useEffect(() => {
    if (!currentQuestion?.id) return;
    const questionId = currentQuestion.id;

    setShowAnswer(false);
    setAttemptHistory([]);
    setLastAttemptScore(null);
    setHistoryLoaded(false);
    setHistoryLoading(true);
    setQuestionStartTime(Date.now());
    autoSubmitRef.current = null;

    let cancelled = false;

    // Eagerly load attempt history so lastAttemptScore is ready for delta comparison
    fetch(`/api/attempts?questionId=${questionId}&pageSize=10`)
      .then(r => r.json())
      .then(d => {
        if (cancelled || !d.success) return;
        const items = d.data.items.filter((a: any) => a.overallScore !== null);
        setAttemptHistory(items.map((a: any) => ({
          date: new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          score: Math.round(a.overallScore),
        })).reverse());
        if (items.length > 0) setLastAttemptScore(Math.round(items[0].overallScore));
        setHistoryLoaded(true);
      })
      .catch(() => { })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });

    if (currentQuestion.content) {
      setQuestionLoading(false);
    } else {
      setQuestionLoading(true);
      fetch(`/api/questions/${questionId}`)
        .then(r => r.json())
        .then(d => {
          if (cancelled || !d.success) return;
          setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, ...d.data } : q));
        })
        .catch(() => { })
        .finally(() => {
          if (!cancelled) setQuestionLoading(false);
        });
    }

    return () => { cancelled = true; };
  }, [currentQuestion?.id, currentQuestion?.content]);

  const loadAttemptHistory = async () => {
    if (!currentQuestion?.id) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/attempts?questionId=${currentQuestion.id}&pageSize=10`);
      const d = await res.json();
      if (d.success) {
        const items = d.data.items.filter((a: any) => a.overallScore !== null);
        const history = items.map((a: any) => ({
          date: new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
          score: Math.round(a.overallScore),
        })).reverse();
        setAttemptHistory(history);
        if (items.length > 0) setLastAttemptScore(Math.round(items[0].overallScore));
      }
      setHistoryLoaded(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  const triggerAutoSubmit = useCallback(async () => {
    if (!submitted && autoSubmitRef.current) {
      await autoSubmitRef.current();
    }
  }, [submitted]);

  const goToNext = useCallback(async () => {
    if (currentIndex >= totalQuestions - 1) return;

    await triggerAutoSubmit();

    if (currentIndex >= questions.length - 1) {
      const loaded = await fetchQuestionPage(questionPage + 1);
      if (!loaded) return;
    }

    setCurrentIndex(currentIndex + 1);
    setSubmitted(false);
    setScore(null);
  }, [currentIndex, fetchQuestionPage, questionPage, questions.length, totalQuestions, triggerAutoSubmit]);

  const goToPrev = async () => {
    if (currentIndex > 0) {
      await triggerAutoSubmit();
      setCurrentIndex(currentIndex - 1);
      setSubmitted(false);
      setScore(null);
    }
  };

  const resetQuestion = () => {
    // Capture this score as the comparison point for the next retry attempt
    if (score) {
      const overallScore90 = score.aiScores?.overall != null
        ? Math.round(score.aiScores.overall)
        : score.marksTotal > 0 ? Math.round((score.marksEarned / score.marksTotal) * 90) : 0;
      setLastAttemptScore(overallScore90);
    }
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

  const jumpToQuestion = (index: number) => {
    triggerAutoSubmit();
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

  const submitReport = async () => {
    if (!reportReason || !currentQuestion) return;
    setReportSubmitting(true);
    try {
      await fetch("/api/questions/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: currentQuestion.id, reason: reportReason, details: reportDetails }),
      });
      setReportDone(prev => new Set(prev).add(currentQuestion.id));
      setShowReportModal(false);
      setReportReason("");
      setReportDetails("");
    } finally {
      setReportSubmitting(false);
    }
  };

  // Collect unique tags across all questions for topic filter
  const allTopics = Array.from(new Set(questions.flatMap((q: any) => q.tags || []))).slice(0, 15);
  const filteredQuestions = selectedTopic === "all" ? questions : questions.filter((q: any) => (q.tags || []).includes(selectedTopic));

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
          <div className="relative flex h-full w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-700">
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">{formatType(type)}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {questions.length} of {totalQuestions || questions.length} loaded
                </p>
              </div>
              <button onClick={() => setShowList(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300">
                <X className="h-5 w-5" />
              </button>
            </div>
            {!accessInfo?.isStaff && accessInfo?.centreId && (
              <div className="flex flex-wrap gap-1.5 border-b px-3 py-2 dark:border-slate-700">
                {[
                  { key: "all", label: "All" },
                  { key: "my-centre", label: "My Centre" },
                  { key: "public", label: "Public" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedSource(key as "all" | "my-centre" | "public");
                      setSelectedTopic("all");
                    }}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${selectedSource === key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {/* Topic filter inside list panel */}
            {allTopics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 border-b px-3 py-2 dark:border-slate-700">
                <button onClick={() => setSelectedTopic("all")} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${selectedTopic === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"}`}>All</button>
                {allTopics.map(t => (
                  <button key={t} onClick={() => setSelectedTopic(t)} className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize transition ${selectedTopic === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"}`}>{t}</button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-2">
              {filteredQuestions.map((q) => {
                const origIdx = questions.indexOf(q);
                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(origIdx)}
                    className={`w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-gray-50 dark:hover:bg-slate-700/40 ${origIdx === currentIndex ? "bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/40 dark:ring-indigo-700" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${origIdx === currentIndex ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"}`}>
                        {origIdx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-slate-100">{q.title}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${q.difficulty === "EASY" ? "bg-green-100 text-green-700" : q.difficulty === "HARD" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"}`}>
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
                );
              })}
              {questions.length < totalQuestions && (
                <button
                  onClick={() => fetchQuestionPage(questionPage + 1)}
                  disabled={loadingMore}
                  className="mt-2 flex w-full items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {loadingMore ? "Loading..." : "Load more questions"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{formatType(type)}</h1>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500 dark:text-slate-400">Question {currentIndex + 1} of {totalQuestions || questions.length}</p>
            {lastAttemptScore !== null && (
              <span className="text-xs text-gray-400 dark:text-slate-500">· Last: <span className="font-semibold text-gray-600 dark:text-slate-300">{lastAttemptScore}/90</span></span>
            )}
          </div>
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
        {Array.from({ length: totalQuestions || questions.length }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${i === currentIndex
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
        <CardHeader className="bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base dark:text-slate-100">{currentQuestion?.title}</CardTitle>
            <button
              onClick={() => setShowAnswer(a => !a)}
              disabled={questionLoading || !currentQuestion?.content}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {showAnswer ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Render based on question type — key forces remount on question change so all
              local state (textarea, audio recording, MCQ selection, etc.) resets cleanly. */}
          {/* Block copying question text for non-super-admins */}
          <div onCopy={!isSuperAdmin ? (e) => e.preventDefault() : undefined}>
            {questionLoading || !currentQuestion?.content ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
              </div>
            ) : (
              <QuestionRenderer
                key={currentQuestion?.id}
                question={currentQuestion}
                submitted={submitted}
                showAnswer={showAnswer}
                submitRef={autoSubmitRef}
                allowCopyPaste={isSuperAdmin}
                onSubmit={(response: any) => {
                  setSubmitted(true);
                  const result = response?.scoreResult as ScoreResult | undefined;
                  // For server-scored types the score endpoint returns modelAnswer; patch the question in-place
                  if (response?.modelAnswer && currentQuestion) {
                    setQuestions(prev => prev.map((q, i) =>
                      i === currentIndex ? { ...q, modelAnswer: response.modelAnswer } : q
                    ));
                  }
                  if (result) {
                    setScore(result);
                    saveAttempt(currentQuestion, result, response);
                    // For AI-scored types, percentile isn't in result yet — fetch it after save
                    if (result.percentile === undefined && currentQuestion && !result.pending) {
                      const overallScore = result.marksTotal > 0
                        ? Math.round((result.marksEarned / result.marksTotal) * 90)
                        : (result.aiScores?.overall != null ? Math.round(result.aiScores.overall) : 0);
                      fetch(`/api/questions/${currentQuestion.id}/percentile?score=${overallScore}`)
                        .then(r => r.json())
                        .then(d => {
                          if (d.success && d.data.percentile !== null) {
                            setScore(prev => prev ? { ...prev, percentile: d.data.percentile } : prev);
                          }
                        })
                        .catch(() => { });
                    }
                  }
                }}
                score={score}
                onScoringChange={setCheckingAnswer}
              />
            )}

            {/* Screen-reader score announcement */}
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {submitted && score
                ? score.correct !== undefined
                  ? `Result: ${score.correct ? "Correct" : "Incorrect"}. ${score.marksEarned} of ${score.marksTotal} marks.${score.message ? ` ${score.message}` : ""}`
                  : `Submitted. ${score.marksEarned} of ${score.marksTotal} marks.`
                : ""}
            </p>

            {/* Score Summary (shown after submission) */}
            {submitted && score && (
              <div className="mt-6">
                <ScoreSummary result={score} lastAttemptScore={lastAttemptScore} questionType={type} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Model Answer — shown after submission OR when Show Answer is toggled */}
      {/* Hidden for fill-blanks types because the per-blank Correct Answers section already shows this */}
      {(submitted || showAnswer) && currentQuestion?.modelAnswer &&
        !["READING_FILL_BLANKS_DRAG", "READING_FILL_BLANKS_DROPDOWN", "LISTENING_FILL_BLANKS", "REORDER_PARAGRAPHS"].includes(type) && (
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-green-800 dark:text-green-300">
                <CheckCircle2 className="h-5 w-5" />
                Model Answer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-green-900 whitespace-pre-wrap dark:text-green-200">{currentQuestion.modelAnswer}</p>
            </CardContent>
          </Card>
        )}

      {/* Explanation — shown after submission OR when Show Answer is toggled */}
      {(submitted || showAnswer) && currentQuestion?.explanation && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Explanation:</p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-200">{currentQuestion.explanation}</p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goToPrev} disabled={currentIndex === 0} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <div className="flex gap-2">
          {!submitted && (
            <Button
              onClick={triggerAutoSubmit}
              loading={checkingAnswer}
              disabled={questionLoading || !currentQuestion?.content}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Check Answer
            </Button>
          )}
          {submitted && (
            <Button variant="outline" onClick={resetQuestion} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Try Again
            </Button>
          )}
        </div>
        <Button
          onClick={goToNext}
          disabled={currentIndex >= totalQuestions - 1 || loadingMore}
          loading={loadingMore}
          className="gap-2"
        >
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Score History */}
      {(historyLoaded || historyLoading) ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <BarChart2 className="h-4 w-4 text-indigo-500" />
              Your Score History
              <span className="ml-auto text-xs font-normal text-gray-400 dark:text-slate-500">{attemptHistory.length} attempt{attemptHistory.length !== 1 ? "s" : ""}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {historyLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-indigo-400" /></div>
            ) : attemptHistory.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-500 dark:text-slate-400">No previous scored attempts for this question.</p>
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
            <p className="mt-1 text-center text-xs text-gray-400 dark:text-slate-500">Green ≥ 60 · Amber ≥ 30 · Red &lt; 30</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadAttemptHistory} className="gap-2">
            <BarChart2 className="h-4 w-4" /> Load score history
          </Button>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowReportModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-800">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Report an Issue</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Help us improve by flagging errors in this question.</p>
            <div className="mt-4 space-y-2">
              {[
                { key: "WRONG_ANSWER", label: "Wrong answer / model answer" },
                { key: "BAD_AUDIO", label: "Audio not working / wrong audio" },
                { key: "UNCLEAR_QUESTION", label: "Question is unclear" },
                { key: "BROKEN_IMAGE", label: "Image missing or broken" },
                { key: "OTHER", label: "Other issue" },
              ].map(({ key, label }) => (
                <label key={key} className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm transition ${reportReason === key ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/40" : "border-gray-200 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700/40"}`}>
                  <input type="radio" name="reason" value={key} checked={reportReason === key} onChange={() => setReportReason(key)} className="accent-red-500" />
                  {label}
                </label>
              ))}
            </div>
            <textarea
              className="mt-3 w-full rounded-lg border border-gray-200 p-2.5 text-xs focus:border-red-400 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder:text-slate-500"
              placeholder="Any additional details? (optional)"
              rows={2}
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <Button onClick={submitReport} disabled={!reportReason || reportSubmitting} loading={reportSubmitting} className="flex-1 bg-red-600 hover:bg-red-700">
                Submit Report
              </Button>
              <Button variant="outline" onClick={() => setShowReportModal(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-t pt-4 dark:border-slate-700">
        <Flag className="h-4 w-4 text-gray-400 dark:text-slate-500" />
        <span className="text-xs text-gray-400 dark:text-slate-500 mr-1">Mark as:</span>
        {FLAG_OPTIONS.map(({ key, label, icon: Icon, color }) => {
          const isActive = flags[currentQuestion?.id] === key;
          return (
            <button
              key={key}
              onClick={() => setFlag(key)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${isActive ? color : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50 dark:border-slate-600 dark:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700/40"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
        <button
          onClick={() => setShowReportModal(true)}
          className={`ml-auto flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${reportDone.has(currentQuestion?.id) ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500"}`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          {reportDone.has(currentQuestion?.id) ? "Reported" : "Report"}
        </button>
      </div>
    </div>
  );
}

