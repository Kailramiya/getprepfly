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
  const [reportSubmitting, setReportSubmitting] = useState(false);
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowList(false)} />
          {/* Panel */}
          <div className="relative flex h-full w-full max-w-md flex-col bg-background/95 backdrop-blur-2xl shadow-2xl ring-1 ring-white/10 animate-in slide-in-from-right duration-500 ease-fluid">
            <div className="flex items-center justify-between border-b border-muted-foreground/10 px-6 py-5">
              <div>
                <p className="text-xl font-extrabold tracking-tight text-foreground">{formatType(type)}</p>
                <p className="mt-1 text-sm font-medium text-muted-foreground/80">
                  {questions.length} of {totalQuestions || questions.length} loaded
                </p>
              </div>
              <button onClick={() => setShowList(false)} className="rounded-full p-2 text-muted-foreground/50 hover:bg-muted-foreground/10 hover:text-foreground transition-all duration-300 ease-fluid active:scale-95">
                <X className="h-6 w-6" />
              </button>
            </div>
            {!accessInfo?.isStaff && accessInfo?.centreId && (
              <div className="flex flex-wrap gap-2 border-b border-muted-foreground/10 px-6 py-4">
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
                    className={`rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition-all duration-500 ease-fluid hover:shadow-md active:scale-95 ${selectedSource === key ? "bg-primary text-primary-foreground shadow-primary/25" : "bg-muted-foreground/10 text-muted-foreground/70 hover:bg-muted-foreground/20 hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {/* Topic filter inside list panel */}
            {allTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 border-b border-muted-foreground/10 px-6 py-4">
                <button onClick={() => setSelectedTopic("all")} className={`rounded-full px-4 py-1.5 text-sm font-bold shadow-sm transition-all duration-500 ease-fluid hover:shadow-md active:scale-95 ${selectedTopic === "all" ? "bg-primary text-primary-foreground shadow-primary/25" : "bg-muted-foreground/10 text-muted-foreground/70 hover:bg-muted-foreground/20 hover:text-foreground"}`}>All</button>
                {allTopics.map(t => (
                  <button key={t} onClick={() => setSelectedTopic(t)} className={`rounded-full px-4 py-1.5 text-sm font-bold shadow-sm capitalize transition-all duration-500 ease-fluid hover:shadow-md active:scale-95 ${selectedTopic === t ? "bg-primary text-primary-foreground shadow-primary/25" : "bg-muted-foreground/10 text-muted-foreground/70 hover:bg-muted-foreground/20 hover:text-foreground"}`}>{t}</button>
                ))}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredQuestions.map((q) => {
                const origIdx = questions.indexOf(q);
                return (
                  <button
                    key={q.id}
                    onClick={() => jumpToQuestion(origIdx)}
                    className={`w-full rounded-[1.25rem] px-4 py-3 text-left transition-all duration-500 ease-fluid active:scale-[0.98] ${origIdx === currentIndex ? "bg-primary/10 shadow-glass ring-1 ring-primary/30" : "hover:bg-muted-foreground/5 hover:ring-1 hover:ring-white/5"}`}
                  >
                    <div className="flex items-start gap-4">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold shadow-inner ${origIdx === currentIndex ? "bg-primary text-primary-foreground" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                        {origIdx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-base font-extrabold tracking-tight ${origIdx === currentIndex ? "text-primary" : "text-foreground"}`}>{q.title}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${q.difficulty === "EASY" ? "bg-green-500/10 text-green-500" : q.difficulty === "HARD" ? "bg-red-500/10 text-red-500" : "bg-muted-foreground/10 text-muted-foreground"}`}>
                            {q.difficulty}
                          </span>
                          {q.isPrediction && <Star className="h-3.5 w-3.5 text-amber-500 drop-shadow-sm" />}
                          {flags[q.id] === "WEAK" && <ThumbsDown className="h-3.5 w-3.5 text-red-500 drop-shadow-sm" />}
                          {flags[q.id] === "REVIEW_AGAIN" && <RefreshCw className="h-3.5 w-3.5 text-amber-500 drop-shadow-sm" />}
                          {flags[q.id] === "STRONG" && <ThumbsUp className="h-3.5 w-3.5 text-green-500 drop-shadow-sm" />}
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
                  className="mt-4 flex w-full items-center justify-center rounded-full border-2 border-muted-foreground/10 bg-transparent px-4 py-3 text-sm font-bold text-muted-foreground/70 transition-all duration-500 ease-fluid hover:bg-muted-foreground/5 hover:text-foreground active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load more questions"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{formatType(type)}</h1>
          <div className="mt-1 flex items-center gap-3">
            <p className="text-sm font-medium text-muted-foreground/80">Question <span className="font-bold text-foreground">{currentIndex + 1}</span> of {totalQuestions || questions.length}</p>
            {lastAttemptScore !== null && (
              <>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Last Score: <span className="text-foreground font-bold">{lastAttemptScore}/90</span></span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {currentQuestion?.isPrediction && (
            <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-none rounded-full shadow-sm font-bold transition-colors">
              Prediction
            </Badge>
          )}
          <Badge className={`border-none rounded-full shadow-sm font-bold transition-colors ${
            currentQuestion?.difficulty === "EASY" ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" :
            currentQuestion?.difficulty === "HARD" ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" :
            "bg-muted-foreground/10 text-muted-foreground hover:bg-muted-foreground/20"
          }`}>
            {currentQuestion?.difficulty}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setShowList(true)} className="gap-2 rounded-full shadow-sm hover:shadow-md transition-all duration-700 ease-fluid active:scale-[0.98]">
            <List className="h-4 w-4" /> All Questions
          </Button>
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {Array.from({ length: totalQuestions || questions.length }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-1000 ease-fluid ${i === currentIndex
                ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                : i < currentIndex
                  ? "bg-primary/30"
                  : "bg-muted-foreground/10"
              }`}
          />
        ))}
      </div>

      {/* Question Content */}
      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardHeader className="bg-transparent border-b border-muted-foreground/10 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-xl font-extrabold tracking-tight text-foreground leading-tight">{currentQuestion?.title}</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnswer(a => !a)}
              disabled={questionLoading || !currentQuestion?.content}
              className="gap-2 rounded-full shadow-sm hover:shadow-md transition-all duration-700 ease-fluid active:scale-[0.98] shrink-0"
            >
              {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAnswer ? "Hide Answer" : "Show Answer"}
            </Button>
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
          <div className="rounded-[2rem] border-none ring-1 ring-green-500/20 bg-green-500/5 shadow-glass backdrop-blur-xl p-6 mt-6">
            <h3 className="flex items-center gap-2 text-base font-extrabold tracking-tight text-green-600 dark:text-green-400 mb-2">
              <CheckCircle2 className="h-5 w-5" />
              Model Answer
            </h3>
            <p className="text-sm font-medium text-green-800 whitespace-pre-wrap dark:text-green-200 leading-relaxed">{currentQuestion.modelAnswer}</p>
          </div>
        )}

      {/* Explanation — shown after submission OR when Show Answer is toggled */}
      {(submitted || showAnswer) && currentQuestion?.explanation && (
        <div className="rounded-[2rem] border-none ring-1 ring-blue-500/20 bg-blue-500/5 shadow-glass backdrop-blur-xl p-6 mt-6">
          <p className="text-base font-extrabold tracking-tight text-blue-600 dark:text-blue-400 mb-2">Explanation</p>
          <p className="text-sm font-medium text-blue-800 whitespace-pre-wrap dark:text-blue-200 leading-relaxed">{currentQuestion.explanation}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Button variant="outline" size="lg" onClick={goToPrev} disabled={currentIndex === 0} className="w-full sm:w-auto gap-2 rounded-full shadow-glass hover:shadow-float transition-all duration-700 ease-fluid active:scale-[0.98]">
          <ChevronLeft className="h-5 w-5" /> Previous
        </Button>
        <div className="flex w-full sm:w-auto gap-3">
          {!submitted && (
            <Button
              size="lg"
              onClick={triggerAutoSubmit}
              loading={checkingAnswer}
              disabled={questionLoading || !currentQuestion?.content}
              className="w-full sm:w-auto gap-2 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-glass hover:shadow-float transition-all duration-700 ease-fluid active:scale-[0.98]"
            >
              <CheckCircle2 className="h-5 w-5" /> Check Answer
            </Button>
          )}
          {submitted && (
            <Button variant="outline" size="lg" onClick={resetQuestion} className="w-full sm:w-auto gap-2 rounded-full shadow-glass hover:shadow-float transition-all duration-700 ease-fluid active:scale-[0.98]">
              <RotateCcw className="h-5 w-5" /> Try Again
            </Button>
          )}
        </div>
        <Button
          size="lg"
          onClick={goToNext}
          disabled={currentIndex >= totalQuestions - 1 || loadingMore}
          loading={loadingMore}
          className="w-full sm:w-auto gap-2 rounded-full shadow-glass hover:shadow-float transition-all duration-700 ease-fluid active:scale-[0.98]"
        >
          Next <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Score History */}
      {(historyLoaded || historyLoading) ? (
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden mt-6">
          <CardHeader className="pb-2 border-b border-muted-foreground/10">
            <CardTitle className="flex items-center gap-2 text-base font-extrabold tracking-tight text-foreground">
              <BarChart2 className="h-5 w-5 text-primary" />
              Your Score History
              <span className="ml-auto text-xs font-semibold text-muted-foreground/60 tracking-widest uppercase">{attemptHistory.length} attempt{attemptHistory.length !== 1 ? "s" : ""}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {historyLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : attemptHistory.length === 0 ? (
              <p className="py-6 text-center text-sm font-medium text-muted-foreground/80">No previous scored attempts for this question.</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={attemptHistory} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 90]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v}/90`, "Score"]}
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", backgroundColor: "hsl(var(--background))" }}
                    cursor={{ fill: "transparent" }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
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
            <p className="mt-4 text-center text-xs font-bold text-muted-foreground/50 tracking-wider">GREEN ≥ 60 <span className="mx-2">•</span> AMBER ≥ 30 <span className="mx-2">•</span> RED &lt; 30</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowReportModal(false)} />
          <div className="relative w-full max-w-sm rounded-[2rem] bg-background p-8 shadow-2xl ring-1 ring-white/10 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-500 ease-fluid">
            <h3 className="text-xl font-extrabold tracking-tight text-foreground">Report an Issue</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground/80">Help us improve by flagging errors in this question.</p>
            <div className="mt-6 space-y-3">
              {[
                { key: "WRONG_ANSWER", label: "Wrong answer / model answer" },
                { key: "BAD_AUDIO", label: "Audio not working / wrong audio" },
                { key: "UNCLEAR_QUESTION", label: "Question is unclear" },
                { key: "BROKEN_IMAGE", label: "Image missing or broken" },
                { key: "OTHER", label: "Other issue" },
              ].map(({ key, label }) => (
                <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 text-sm font-medium transition-all duration-300 ease-fluid ${reportReason === key ? "border-red-500 bg-red-500/5 text-foreground" : "border-muted-foreground/20 hover:bg-muted-foreground/5 hover:border-muted-foreground/40 text-muted-foreground/80"}`}>
                  <input type="radio" name="reason" value={key} checked={reportReason === key} onChange={() => setReportReason(key)} className="accent-red-500 w-4 h-4" />
                  {label}
                </label>
              ))}
            </div>
            <textarea
              className="mt-4 w-full rounded-2xl border-2 border-muted-foreground/20 p-4 text-sm font-medium focus:border-red-500 focus:ring-4 focus:ring-red-500/10 focus:outline-none bg-background transition-all"
              placeholder="Any additional details? (optional)"
              rows={3}
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
            />
            <div className="mt-6 flex gap-3">
              <Button size="lg" onClick={submitReport} disabled={!reportReason || reportSubmitting} loading={reportSubmitting} className="flex-1 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-glass hover:shadow-float active:scale-[0.98] transition-all duration-700 ease-fluid">
                Submit Report
              </Button>
              <Button size="lg" variant="outline" onClick={() => setShowReportModal(false)} className="flex-1 rounded-full active:scale-[0.98] transition-transform duration-700 ease-fluid">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-muted-foreground/10 pt-6 mt-8">
        <Flag className="h-4 w-4 text-muted-foreground/50" />
        <span className="text-sm font-bold text-muted-foreground/50 uppercase tracking-wider mr-2">Mark as:</span>
        {FLAG_OPTIONS.map(({ key, label, icon: Icon, color }) => {
          const isActive = flags[currentQuestion?.id] === key;
          // Simplify color mapping for high-end design
          const baseStyle = "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition-all duration-500 ease-fluid hover:shadow-md active:scale-[0.98]";
          let activeColorClass = "";
          if (key === "WEAK") activeColorClass = "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400";
          if (key === "REVIEW_AGAIN") activeColorClass = "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400";
          if (key === "STRONG") activeColorClass = "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400";
          
          return (
            <button
              key={key}
              onClick={() => setFlag(key)}
              className={`${baseStyle} ${isActive ? activeColorClass : "border-muted-foreground/20 bg-background text-muted-foreground/70 hover:bg-muted-foreground/5 hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
        <button
          onClick={() => setShowReportModal(true)}
          className={`ml-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition-all duration-500 ease-fluid active:scale-[0.98] ${reportDone.has(currentQuestion?.id) ? "border-red-500 bg-red-500/10 text-red-500" : "border-muted-foreground/20 text-muted-foreground/70 hover:border-red-500 hover:text-red-500"}`}
        >
          <AlertTriangle className="h-4 w-4" />
          {reportDone.has(currentQuestion?.id) ? "Reported" : "Report Issue"}
        </button>
      </div>
    </div>
  );
}

