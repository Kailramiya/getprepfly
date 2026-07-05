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

  const finishTest = useCallback(async () => {
    if (finishing) return;
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
      setNavigating(true);
      if (!submitted) {
        if (autoSubmitRef.current) {
        try {
          await autoSubmitRef.current();
        } catch (e) {
          console.error("Auto-submit failed", e);
          alert("Network error: Could not save your answer. Please check your connection and try again.");
          setNavigating(false);
          return;
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
  }, [currentIdx, totalQuestions, testId, test, submitted]);

  // Called by QuestionRenderer when student explicitly submits
  const handleQuestionSubmit = async (response: any) => {
    if (!currentQuestion) return;
    setSubmitted(true);
    pendingResponseRef.current = null;

    // Cache blob URL (in-memory, survives current session navigation)
    if (response?.audioUrl && typeof response.audioUrl === "string") {
      recordingUrlsRef.current.set(currentQuestion.question.id, response.audioUrl);
    }

    const result: ScoreResult | undefined = response?.scoreResult;
    const overallScore = result && result.marksTotal > 0
      ? Math.round((result.marksEarned / result.marksTotal) * 90)
      : null;

    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: currentQuestion.question.id,
        responseText: typeof response?.text === "string" ? response.text : JSON.stringify(response),
        responseAudio: response?.persistentAudioUrl || null,
        mockTestId: testId,
        overallScore,
        scores: result?.aiScores || null,
      }),
    });

    const res = await fetch(`/api/mock-tests/${testId}`);
    const data = await res.json();
    if (data.success) setTest(data.data);
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
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-slate-100">Test Completed!</h1>
          <p className="mt-2 text-gray-500 dark:text-slate-400">{test.title}</p>
        </div>

        {/* Overall Score */}
        <Card className="overflow-hidden">
          <div className="bg-indigo-600 px-6 py-8 text-center text-white">
            <p className="text-sm text-indigo-200">Overall Score</p>
            <p className="text-5xl font-bold">{test.overallScore || "--"}<span className="text-2xl text-indigo-200">/90</span></p>
          </div>
          <CardContent className="grid grid-cols-4 gap-4 p-6">
            {[
              { label: "Speaking", score: test.speakingScore, icon: Mic, color: "text-teal-600" },
              { label: "Writing", score: test.writingScore, icon: PenTool, color: "text-blue-600" },
              { label: "Reading", score: test.readingScore, icon: BookOpen, color: "text-purple-600" },
              { label: "Listening", score: test.listeningScore, icon: Headphones, color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <s.icon className={`mx-auto h-6 w-6 ${s.color}`} />
                <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-slate-100">{s.score ?? "--"}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{s.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.push("/mock-test")}>Back to Mock Tests</Button>
          <Button onClick={() => router.push("/progress")}>View Progress</Button>
        </div>

        {/* Question Review with answers */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Question Review</h2>
          {test.questions.map((tq, idx) => {
            const attempt = test.attempts.find((a) => a.questionId === tq.question.id);
            return (
              <Card key={tq.id}>
                <CardHeader className="flex flex-row items-center justify-between bg-gray-50 dark:bg-slate-800/50 py-3 px-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      Q{idx + 1}: {tq.question.title}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                      {tq.question.type?.replace(/_/g, " ")} · {tq.question.section}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attempt ? (
                      <Badge variant="success">Answered</Badge>
                    ) : (
                      <Badge variant="secondary">Skipped</Badge>
                    )}
                    {attempt?.overallScore != null && (
                      <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                        {attempt.overallScore}/90
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  {/* Audio playback for self-evaluation on speaking questions */}
                  {attempt?.responseAudio && (
                    <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950/30">
                      <p className="mb-2 text-xs font-semibold text-teal-700 dark:text-teal-300">🎤 Your Recording</p>
                      <audio
                        controls
                        src={attempt.responseAudio}
                        className="w-full"
                        style={{ height: "36px" }}
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
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Top Bar — Timer + Progress */}
      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
        <div className="flex items-center gap-4">
          <Badge className={SECTION_COLORS[qSection]}>{qSection}</Badge>
          <span className="text-sm text-gray-500 dark:text-slate-400">
            Q {currentIdx + 1} / {totalQuestions}
          </span>
          <span className="text-sm text-gray-400 dark:text-slate-500">
            ({attemptedCount} answered)
          </span>
        </div>
        <div className="flex items-center gap-4">
          {navigating && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
              <Save className="h-3 w-3 animate-pulse" /> Scoring…
            </span>
          )}
          <div className={`flex items-center gap-1.5 text-sm font-mono font-medium ${
            timeLeft !== null && timeLeft <= 300 ? "text-red-600 animate-pulse" : "text-gray-700 dark:text-slate-300"
          }`}>
            <Clock className={`h-4 w-4 ${timeLeft !== null && timeLeft <= 300 ? "text-red-600" : "text-gray-400 dark:text-slate-500"}`} />
            {timeLeft !== null ? formatTime(timeLeft) : "--:--"}
          </div>
          <Button variant="destructive" size="sm" onClick={finishTest} loading={finishing}>
            <Flag className="mr-1.5 h-3.5 w-3.5" />
            Finish Test
          </Button>
        </div>
      </div>

      {/* Section Progress */}
      <div className="flex gap-3">
        {Object.entries(sectionBreakdown).map(([sec, info]) => {
          const SIcon = SECTION_ICONS[sec] || BookOpen;
          return (
            <div key={sec} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
              <SIcon className="h-3.5 w-3.5" />
              {sec}: {info.attempted}/{info.total}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-gray-50 dark:bg-slate-800/50">
          <div>
            <CardTitle className="text-base dark:text-slate-100">{currentQuestion?.question?.title}</CardTitle>
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              {currentQuestion?.question?.type?.replace(/_/g, " ")} · {currentQuestion?.question?.difficulty}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAttempted && !submitted && (
              <Badge variant="success">Previously Answered — can re-edit</Badge>
            )}
            {submitted && <Badge variant="success">Answered</Badge>}
          </div>
        </CardHeader>
        <CardContent className="p-6">
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
                onSubmit={handleQuestionSubmit}
                onResponseChange={(r) => { pendingResponseRef.current = r; }}
                submitRef={autoSubmitRef}
                playOnce={true}
                isMockTest={true}
                initialAudioUrl={recordingUrlsRef.current.get(currentQuestion.question.id)}
                initialResponse={prefilledResponse ?? undefined}
              />
            );
          })()}

          {/* Info banner — only shown after explicit submit or if previously answered */}
          {(submitted || isAttempted) && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              {submitted
                ? "Answer saved. Complete the test to see correct answers and scores."
                : "You answered this question before. You can re-submit to update your answer."}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        {currentIdx === totalQuestions - 1 ? (
          <Button
            onClick={finishTest}
            loading={finishing}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <Flag className="h-4 w-4" />
            Finish Test
          </Button>
        ) : (
          <Button onClick={goNext} loading={navigating} className="gap-2">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
