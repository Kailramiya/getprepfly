"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Clock,
  CheckCircle2, Mic, PenTool, BookOpen, Headphones,
  Flag, Loader2,
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
  questions: TestQuestion[];
  attempts: { questionId: string; overallScore: number | null; scores: any }[];
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
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);

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

  // Timer
  useEffect(() => {
    if (!test || test.status !== "IN_PROGRESS") return;
    const start = new Date(test.startedAt).getTime();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [test]);

  const currentQuestion = test?.questions[currentIdx];
  const qSection = currentQuestion?.question?.section || "";
  const isAttempted = test?.attempts?.some((a) => a.questionId === currentQuestion?.question?.id);

  const totalQuestions = test?.questions?.length || 0;
  const attemptedCount = test?.attempts?.length || 0;

  // Group questions by section
  const sectionBreakdown = test?.questions?.reduce((acc, q) => {
    const sec = q.question.section;
    if (!acc[sec]) acc[sec] = { total: 0, attempted: 0 };
    acc[sec].total++;
    if (test?.attempts?.some((a) => a.questionId === q.question.id)) acc[sec].attempted++;
    return acc;
  }, {} as Record<string, { total: number; attempted: number }>) || {};

  const goNext = useCallback(() => {
    if (currentIdx < totalQuestions - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      setSubmitted(false);
      // Save position
      fetch(`/api/mock-tests/${testId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentIndex: nextIdx, currentSection: test?.questions[nextIdx]?.question?.section }),
      });
    }
  }, [currentIdx, totalQuestions, testId, test]);

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setSubmitted(false);
    }
  };

  // Called by QuestionRenderer when student submits an answer
  const handleQuestionSubmit = async (response: any) => {
    if (!currentQuestion) return;
    setSubmitted(true);
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
        mockTestId: testId,
        overallScore,
      }),
    });

    const res = await fetch(`/api/mock-tests/${testId}`);
    const data = await res.json();
    if (data.success) setTest(data.data);
  };

  const finishTest = async () => {
    setFinishing(true);
    await fetch(`/api/mock-tests/${testId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    router.push(`/mock-test`);
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
                  <QuestionRenderer
                    key={tq.question.id}
                    question={{ ...tq.question, isPrediction: false, marks: 1 }}
                    submitted={true}
                    showAnswer={true}
                    showFeedback={true}
                    onSubmit={() => {}}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-gray-700 dark:text-slate-300">
            <Clock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            {formatTime(elapsed)}
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
          {isAttempted && <Badge variant="success">Answered</Badge>}
        </CardHeader>
        <CardContent className="p-6">
          {currentQuestion?.question && (
            <QuestionRenderer
              key={currentQuestion.question.id}
              question={{
                ...currentQuestion.question,
                isPrediction: false,
                marks: 1,
              }}
              submitted={submitted || !!isAttempted}
              showAnswer={false}
              showFeedback={false}
              onSubmit={handleQuestionSubmit}
            />
          )}

          {/* No score feedback shown during the test — answers revealed after completion */}
          {(submitted || isAttempted) && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
              Answer recorded. Complete the test to see correct answers and scores.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={currentIdx === 0} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        <Button onClick={goNext} disabled={currentIdx === totalQuestions - 1} className="gap-2">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
