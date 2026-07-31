"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight, Clock,
  CheckCircle2, Mic, PenTool, BookOpen, Headphones,
  Flag, Loader2, Save,
} from "lucide-react";
import {
  QuestionRenderer,
  ScoreResult,
} from "@/components/practice/question-renderer";

interface TestQuestion {
  id: string;
  order: number;
  question: {
    id: string;
    type: string;
    section: string;
    title: string;
    difficulty: string;
    content: any;
    explanation: string | null;
    modelAnswer: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
  };
}

interface MockTestData {
  id: string;
  title: string;
  status: string;
  currentSection: string;
  currentIndex: number;
  startedAt: string;
  completedAt: string | null;
  speakingScore: number | null;
  writingScore: number | null;
  readingScore: number | null;
  listeningScore: number | null;
  overallScore: number | null;
  mockType: string;
  section: string | null;
  questions: TestQuestion[];
  attempts: { questionId: string; overallScore: number | null; scores: any; responseText: string | null; responseAudio: string | null }[];
}

function extractInitialResponse(questionType: string, responseText: string | null): any {
  if (!responseText) return null;
  const TEXT_TYPES = ["WRITE_ESSAY", "SUMMARIZE_WRITTEN_TEXT", "SUMMARIZE_SPOKEN_TEXT", "WRITE_FROM_DICTATION"];
  try {
    const parsed = JSON.parse(responseText);
    if (["READING_MCQ_SINGLE", "LISTENING_MCQ_SINGLE", "HIGHLIGHT_CORRECT_SUMMARY", "SELECT_MISSING_WORD"].includes(questionType)) {
      return parsed.answer ?? null;
    }
    if (["READING_MCQ_MULTIPLE", "LISTENING_MCQ_MULTIPLE"].includes(questionType)) {
      return parsed.answers ?? null;
    }
    if (questionType === "REORDER_PARAGRAPHS") {
      return parsed.order ?? null;
    }
    if (["READING_FILL_BLANKS_DRAG", "READING_FILL_BLANKS_DROPDOWN", "LISTENING_FILL_BLANKS"].includes(questionType)) {
      return parsed.answers ?? null;
    }
    if (TEXT_TYPES.includes(questionType)) {
      // Stored as { text: "..." } object
      return parsed.text ?? (typeof parsed === "string" ? parsed : null);
    }
    return null;
  } catch {
    // JSON.parse failed — responseText is a raw string (plain text answer)
    if (TEXT_TYPES.includes(questionType)) return responseText;
    return null;
  }
}

const SECTION_ICONS: Record<string, any> = {
  SPEAKING: Mic, WRITING: PenTool, READING: BookOpen, LISTENING: Headphones,
};
const SECTION_COLORS: Record<string, string> = {
  SPEAKING: "bg-teal-100 text-teal-700",
  WRITING: "bg-blue-100 text-blue-700",
  READING: "bg-purple-100 text-purple-700",
  LISTENING: "bg-orange-100 text-orange-700",
};

export default function MockTestSessionPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<MockTestData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [finishing, setFinishing] = useState(false);

  const [navigating, setNavigating] = useState(false);

  // Tracks the latest in-progress response from QuestionRenderer (before explicit submit)
  const pendingResponseRef = useRef<any>(null);
  // Ref to QuestionRenderer's current submit function — triggered on Next/Prev
  const autoSubmitRef = useRef<(() => void | Promise<void>) | null>(null);
  // Cache student recording blob URLs so they survive navigation between questions
  const recordingUrlsRef = useRef<Map<string, string>>(new Map());

  // Fetch test data
  useEffect(() => {
    const fetchTest = async () => {
      const res = await fetch(`/api/mock-tests/${testId}`);
      const data = await res.json();
      if (data.success) {
        setTest(data.data);
        setCurrentIdx(data.data.currentIndex || 0);
      }
      setLoading(false);
    };
    fetchTest();
  }, [testId]);

  // Calculate total allowed time
  const getTimeLimit = useCallback(() => {
    if (!test) return 135 * 60;
    if (test.mockType === "FULL") return 135 * 60;
    if (test.section === "SPEAKING") return 35 * 60;
    if (test.section === "WRITING") return 32 * 60;
    if (test.section === "READING") return 30 * 60;
    if (test.section === "LISTENING") return 43 * 60;
    return 135 * 60;
  }, [test]);

  // Stop every <audio> element on the page (question audio, recording playback, etc.)
  const stopAllAudio = () =>
    document.querySelectorAll("audio").forEach((a) => { a.pause(); a.currentTime = 0; });

  const finishTest = useCallback(async () => {
    if (finishing) return;
    stopAllAudio();
    if (!submitted) {
      if (autoSubmitRef.current) {
        try {
          await autoSubmitRef.current();
        } catch (e) {
          console.error("Auto-submit failed", e);
          alert("Network error: Could not save your answer. Please check your connection and try again.");
          setFinishing(false);
          return;
        }
      }
    }
    setFinishing(true);
    await fetch(`/api/mock-tests/${testId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    router.push(`/mock-test/${testId}/report`);
  }, [finishing, submitted, testId, router]);

  // Initialize time left based on server start time
  useEffect(() => {
    if (test && test.status === "IN_PROGRESS" && timeLeft === null) {
      const startMs = new Date(test.startedAt).getTime();
      const elapsedSecs = Math.floor((Date.now() - startMs) / 1000);
      const remaining = Math.max(0, getTimeLimit() - elapsedSecs);
      setTimeLeft(remaining);
      
      // Auto-submit immediately if time was already up
      if (remaining === 0) {
        finishTest();
      }
    }
  }, [test, getTimeLimit, timeLeft, finishTest]);

  // Timer interval
  useEffect(() => {
    if (test?.status !== "IN_PROGRESS" || timeLeft === null || timeLeft <= 0 || finishing) return;
    
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          finishTest(); // Auto-submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [test?.status, finishing, timeLeft, finishTest]);

  // Reset submitted and pending response whenever question changes
  useEffect(() => {
    pendingResponseRef.current = null;
    setSubmitted(false);
  }, [currentIdx]);

  const currentQuestion = test?.questions[currentIdx];
  const isAttempted = test?.attempts?.some((a) => a.questionId === currentQuestion?.question?.id);

  const totalQuestions = test?.questions?.length || 0;
  const attemptedCount = new Set(test?.attempts?.map((a) => a.questionId)).size;

  // Group questions by section
  const sectionBreakdown = test?.questions?.reduce((acc, q) => {
    const sec = q.question.section;
    if (!acc[sec]) acc[sec] = { total: 0, attempted: 0 };
    acc[sec].total++;
    if (test?.attempts?.some((a) => a.questionId === q.question.id)) acc[sec].attempted++;
    return acc;
  }, {} as Record<string, { total: number; attempted: number }>) || {};



  const goNext = useCallback(async () => {
    if (currentIdx < totalQuestions - 1) {
      stopAllAudio();
      setNavigating(true);
      if (!submitted) {
        if (autoSubmitRef.current) {
          const submitPromise = autoSubmitRef.current();
          
          if (submitPromise && typeof (submitPromise as any).then === 'function') {
            (submitPromise as Promise<any>).then((_res) => {
              // If the renderer returned the response directly instead of calling onSubmit
              // we can handle it here, but QuestionRenderer usually calls onSubmit itself.
            }).catch((e) => {
              console.error("Background auto-submit failed", e);
            });
          }
        }
      }
      const nextIdx = currentIdx + 1;
      setSubmitted(false);
      setNavigating(false);
      setCurrentIdx(nextIdx);
      fetch(`/api/mock-tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentIndex: nextIdx, currentSection: test?.questions[nextIdx]?.question?.section }),
      });
    }
  }, [currentIdx, totalQuestions, testId, test, submitted, currentQuestion?.question?.id]);

  // Called by QuestionRenderer when student explicitly submits (or via background auto-submit)
  const handleQuestionSubmit = async (response: any, questionIdOverride?: string) => {
    const qId = questionIdOverride || currentQuestion?.question?.id;
    if (!qId) return;
    
    // Only update UI state if the submission is for the question we are currently viewing
    const isCurrentQuestion = qId === currentQuestion?.question?.id;
    
    if (isCurrentQuestion) {
      setSubmitted(true);
      pendingResponseRef.current = null;
    }

    // Cache blob URL (in-memory, survives current session navigation)
    if (response?.audioUrl && typeof response.audioUrl === "string") {
      recordingUrlsRef.current.set(qId, response.audioUrl);
    }

    const result: ScoreResult | undefined = response?.scoreResult;
    const overallScore = result && result.marksTotal > 0
      ? Math.round((result.marksEarned / result.marksTotal) * 90)
      : null;

    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: qId,
        responseText: typeof response?.text === "string" ? response.text : JSON.stringify(response),
        responseAudio: response?.persistentAudioUrl || null,
        mockTestId: testId,
        overallScore,
        rawPointsEarned: result?.marksEarned || result?.rawPointsEarned || null,
        maxPointsPossible: result?.marksTotal || result?.maxPointsPossible || null,
        scores: result?.aiScores || result || null,
      }),
    });

    const res = await fetch(`/api/mock-tests/${testId}`);
    const data = await res.json();
    if (data.success) {
      // Functional update to avoid stale closures
      setTest((_prev) => {
         // Only update if we haven't navigated away or if we just want to merge attempts
         return data.data;
      });
    }
  };


  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!test) {
    return <div className="py-20 text-center text-gray-500">Mock test not found.</div>;
  }

  // Completed — show results + question review
  if (test.status === "COMPLETED") {
    return (
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-fluid">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500/10 mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">Test Completed!</h1>
          <p className="mt-3 text-lg font-medium text-muted-foreground/80">{test.title}</p>
        </div>

        {/* Overall Score */}
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 ease-fluid">
          <div className="bg-gradient-to-br from-primary to-indigo-600 px-6 py-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
            <p className="text-sm font-bold tracking-widest uppercase text-white/80 relative z-10">Overall Score</p>
            <p className="text-7xl font-extrabold tracking-tighter mt-2 relative z-10 drop-shadow-md">{test.overallScore || "--"}<span className="text-3xl text-white/60 font-bold ml-1">/90</span></p>
          </div>
          <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-6 sm:p-8 relative z-10 bg-background/50">
            {[
              { label: "Speaking", score: test.speakingScore, icon: Mic, color: "text-teal-500" },
              { label: "Writing", score: test.writingScore, icon: PenTool, color: "text-blue-500" },
              { label: "Reading", score: test.readingScore, icon: BookOpen, color: "text-purple-500" },
              { label: "Listening", score: test.listeningScore, icon: Headphones, color: "text-orange-500" },
            ].map((s) => (
              <div key={s.label} className="text-center flex flex-col items-center">
                <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] shadow-inner mb-3 bg-background/80 ${s.color}`}>
                  <s.icon className={`h-6 w-6`} />
                </div>
                <p className="text-3xl font-extrabold tracking-tight text-foreground">{s.score ?? "--"}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 mt-1">{s.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-fluid">
          <Button size="lg" variant="outline" onClick={() => router.push("/mock-test")} className="rounded-full shadow-glass hover:shadow-float active:scale-[0.98] transition-all">Back to Mock Tests</Button>
          <Button size="lg" onClick={() => router.push("/progress")} className="rounded-full shadow-glass hover:shadow-float active:scale-[0.98] transition-all">View Progress</Button>
        </div>

        {/* Question Review with answers */}
        <div className="space-y-6 mt-12">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Question Review</h2>
          {test.questions.map((tq, idx) => {
            const attempt = test.attempts.find((a) => a.questionId === tq.question.id);
            return (
              <Card key={tq.id} className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent border-b border-muted-foreground/10 py-5 px-6 sm:px-8">
                  <div>
                    <p className="text-lg font-extrabold tracking-tight text-foreground">
                      <span className="text-primary mr-2">Q{idx + 1}.</span> {tq.question.title}
                    </p>
                    <p className="mt-1.5 text-sm font-medium text-muted-foreground/70 flex items-center gap-2">
                      <Badge variant="outline" className="border-muted-foreground/20 rounded-full shadow-sm font-bold text-xs">{tq.question.section}</Badge>
                      {tq.question.type?.replace(/_/g, " ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {attempt ? (
                      <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-none rounded-full shadow-sm font-bold transition-colors">Answered</Badge>
                    ) : (
                      <Badge variant="secondary" className="border-none rounded-full shadow-sm font-bold">Skipped</Badge>
                    )}
                    {attempt?.overallScore != null && (
                      <span className="text-lg font-extrabold text-primary drop-shadow-sm ml-2">
                        {attempt.overallScore}<span className="text-sm text-muted-foreground/50">/90</span>
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                  {/* Audio playback for self-evaluation on speaking questions */}
                  {attempt?.responseAudio && (
                    <div className="mb-6 rounded-[1.5rem] border-none ring-1 ring-teal-500/20 bg-teal-500/5 shadow-inner p-5">
                      <p className="mb-3 text-sm font-bold tracking-wider uppercase text-teal-600 dark:text-teal-400">🎤 Your Recording</p>
                      <audio
                        controls
                        src={attempt.responseAudio}
                        className="w-full h-10 rounded-full [&::-webkit-media-controls-panel]:bg-teal-50 dark:[&::-webkit-media-controls-panel]:bg-teal-950/50"
                      />
                    </div>
                  )}
                  <QuestionRenderer
                    key={tq.question.id}
                    question={{ ...tq.question, isPrediction: false, marks: 1 }}
                    submitted={true}
                    showAnswer={true}
                    showFeedback={true}
                    onSubmit={() => {}}
                    initialResponse={attempt ? extractInitialResponse(tq.question.type, attempt.responseText) : null}
                    isMockTest={true}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const qSection = currentQuestion?.question?.section || "";

  // Active test — show questions
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Top Bar — Timer + Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-[2rem] bg-background/80 backdrop-blur-xl p-4 sm:p-6 shadow-glass ring-1 ring-white/10 gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Badge className={`px-4 py-1.5 text-sm font-bold border-none shadow-sm ${SECTION_COLORS[qSection]}`}>
            {qSection}
          </Badge>
          <span className="text-base font-extrabold tracking-tight text-foreground bg-muted-foreground/10 px-4 py-1.5 rounded-full">
            Q {currentIdx + 1} <span className="text-muted-foreground/50 mx-1">/</span> {totalQuestions}
          </span>
          <span className="text-sm font-bold text-muted-foreground/60 uppercase tracking-wider">
            {attemptedCount} answered
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          {navigating && (
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground/60">
              <Save className="h-4 w-4 animate-pulse text-primary" /> Saving…
            </span>
          )}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-extrabold tracking-tight shadow-inner ${
            timeLeft !== null && timeLeft <= 300 
              ? "bg-red-500/10 text-red-500 ring-1 ring-red-500/30 animate-pulse" 
              : "bg-muted-foreground/10 text-foreground"
          }`}>
            <Clock className={`h-5 w-5 ${timeLeft !== null && timeLeft <= 300 ? "text-red-500" : "text-muted-foreground/60"}`} />
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
          <Button variant="destructive" size="lg" onClick={finishTest} loading={finishing} className="rounded-full shadow-glass hover:shadow-float active:scale-[0.98] transition-all">
            <Flag className="mr-2 h-4 w-4 fill-current" />
            Finish Test
          </Button>
        </div>
      </div>

      {/* Section Progress */}
      <div className="flex flex-wrap gap-4 px-2">
        {Object.entries(sectionBreakdown).map(([sec, info]) => {
          const SIcon = SECTION_ICONS[sec] || BookOpen;
          return (
            <div key={sec} className="flex items-center gap-2 text-sm font-bold text-muted-foreground/70 uppercase tracking-wider bg-background/50 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm">
              <SIcon className="h-4 w-4 text-primary" />
              {sec}: <span className="text-foreground">{info.attempted}</span><span className="opacity-50">/{info.total}</span>
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="h-2 rounded-full bg-muted-foreground/10 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-1000 ease-fluid"
          style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent border-b border-muted-foreground/10 py-5 px-6 sm:px-8">
          <div>
            <CardTitle className="text-xl font-extrabold tracking-tight text-foreground">{currentQuestion?.question?.title}</CardTitle>
            <p className="mt-1.5 text-sm font-medium text-muted-foreground/70 flex items-center gap-2">
              <Badge variant="outline" className="border-muted-foreground/20 rounded-full shadow-sm font-bold text-xs">{currentQuestion?.question?.difficulty}</Badge>
              {currentQuestion?.question?.type?.replace(/_/g, " ")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAttempted && !submitted && (
              <Badge className="bg-amber-500/10 text-amber-500 border-none rounded-full shadow-sm font-bold px-3 py-1 text-xs">Previously Answered — can re-edit</Badge>
            )}
            {submitted && <Badge className="bg-green-500/10 text-green-500 border-none rounded-full shadow-sm font-bold px-3 py-1 text-xs">Answered</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          {currentQuestion?.question && (() => {
            const existingAttempt = test?.attempts?.find(
              (a) => a.questionId === currentQuestion.question.id
            );
            const prefilledResponse = existingAttempt
              ? extractInitialResponse(currentQuestion.question.type, existingAttempt.responseText)
              : undefined;
            return (
              <QuestionRenderer
                key={`${currentQuestion.question.id}-${currentIdx}`}
                question={{
                  ...currentQuestion.question,
                  isPrediction: false,
                  marks: 1,
                }}
                submitted={submitted}
                showAnswer={false}
                showFeedback={false}
                onSubmit={(res) => handleQuestionSubmit(res, currentQuestion.question.id)}
                onResponseChange={(r) => { pendingResponseRef.current = r; }}
                submitRef={autoSubmitRef}
                playOnce={true}
                isMockTest={true}
                initialAudioUrl={recordingUrlsRef.current.get(currentQuestion.question.id)}
                initialResponse={prefilledResponse ?? undefined}
              />
            );
          })()}

          {/* Info banner — only shown after an explicit submit in this session */}
          {submitted && (
            <div className="mt-8 rounded-[1.25rem] border-none ring-1 ring-blue-500/20 bg-blue-500/5 px-5 py-4 text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              Answer saved. Complete the test to see correct answers and scores.
            </div>
          )}
          {/* Re-edit nudge — shown when navigating back to a previously answered question */}
          {!submitted && isAttempted && (
            <div className="mt-8 rounded-[1.25rem] border-none ring-1 ring-amber-500/20 bg-amber-500/5 px-5 py-4 text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              You answered this question before. You can re-submit to update your answer.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end pt-4">
        {currentIdx === totalQuestions - 1 ? (
          <Button
            size="lg"
            onClick={finishTest}
            loading={finishing}
            className="gap-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-glass hover:shadow-float active:scale-[0.98] transition-all"
          >
            <Flag className="h-5 w-5 fill-current" />
            Finish Test
          </Button>
        ) : (
          <Button size="lg" onClick={goNext} loading={navigating} className="gap-2 rounded-full shadow-glass hover:shadow-float active:scale-[0.98] transition-all">
            Next <ChevronRight className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
