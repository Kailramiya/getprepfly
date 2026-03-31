"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Clock,
  CheckCircle2, XCircle, Mic, PenTool, BookOpen, Headphones,
  Flag, Loader2,
} from "lucide-react";

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
  const [response, setResponse] = useState<any>(null);
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
  const content = currentQuestion?.question?.content as any;
  const qType = currentQuestion?.question?.type || "";
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
      setResponse(null);
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
      setResponse(null);
      setSubmitted(false);
    }
  };

  const submitAnswer = async () => {
    if (!currentQuestion) return;
    setSubmitted(true);

    // Save attempt
    await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: currentQuestion.question.id,
        responseText: typeof response === "string" ? response : JSON.stringify(response),
        mockTestId: testId,
        overallScore: calculateLocalScore(),
      }),
    });

    // Refresh test data to update attempt count
    const res = await fetch(`/api/mock-tests/${testId}`);
    const data = await res.json();
    if (data.success) setTest(data.data);
  };

  const calculateLocalScore = (): number | null => {
    if (!content) return null;
    // MCQ Single
    if (qType.includes("MCQ_SINGLE") || qType === "HIGHLIGHT_CORRECT_SUMMARY" || qType === "SELECT_MISSING_WORD") {
      const correct = content.correctAnswers?.[0] ?? content.correctAnswer;
      return response === correct ? 90 : 0;
    }
    // MCQ Multiple
    if (qType.includes("MCQ_MULTIPLE")) {
      const correct: number[] = content.correctAnswers || [];
      const selected: number[] = response || [];
      const correctSet = new Set(correct);
      if (correct.length === 0) return 0;
      let score = 0;
      selected.forEach((s) => { if (correctSet.has(s)) score++; else score--; });
      return Math.max(0, Math.round((score / correct.length) * 90));
    }
    // Write from Dictation
    if (qType === "WRITE_FROM_DICTATION") {
      const expected = (content.correctText || "").toLowerCase().split(/\s+/);
      const given = (response || "").toLowerCase().split(/\s+/);
      let match = 0;
      expected.forEach((w: string) => { if (given.includes(w)) match++; });
      return expected.length > 0 ? Math.round((match / expected.length) * 90) : 0;
    }
    // Reorder
    if (qType === "REORDER_PARAGRAPHS") {
      const correct = content.correctOrder || [];
      const order = response || [];
      let match = 0;
      for (let i = 0; i < correct.length; i++) {
        if (order[i] === correct[i]) match++;
      }
      return correct.length > 0 ? Math.round((match / correct.length) * 90) : 0;
    }
    return null; // AI scoring needed for speaking/writing
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

  // Completed — show results
  if (test.status === "COMPLETED") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Test Completed!</h1>
          <p className="mt-2 text-gray-500">{test.title}</p>
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
                <p className="mt-2 text-2xl font-bold text-gray-900">{s.score ?? "--"}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={() => router.push("/mock-test")}>Back to Mock Tests</Button>
          <Button onClick={() => router.push("/progress")}>View Progress</Button>
        </div>
      </div>
    );
  }

  // Active test — show questions
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Top Bar — Timer + Progress */}
      <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <Badge className={SECTION_COLORS[qSection]}>{qSection}</Badge>
          <span className="text-sm text-gray-500">
            Q {currentIdx + 1} / {totalQuestions}
          </span>
          <span className="text-sm text-gray-400">
            ({attemptedCount} answered)
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm font-mono font-medium text-gray-700">
            <Clock className="h-4 w-4 text-gray-400" />
            {formatTime(elapsed)}
          </div>
          <Button variant="destructive" size="sm" onClick={finishTest} loading={finishing}>
            <Flag className="mr-1.5 h-3.5 w-3.5" />
            Finish Test
          </Button>
        </div>
      </div>

      {/* Section Progress Dots */}
      <div className="flex gap-3">
        {Object.entries(sectionBreakdown).map(([sec, info]) => {
          const SIcon = SECTION_ICONS[sec] || BookOpen;
          return (
            <div key={sec} className="flex items-center gap-1.5 text-xs text-gray-500">
              <SIcon className="h-3.5 w-3.5" />
              {sec}: {info.attempted}/{info.total}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${((currentIdx + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-gray-50">
          <div>
            <CardTitle className="text-base">{currentQuestion?.question?.title}</CardTitle>
            <p className="mt-1 text-xs text-gray-500">
              {qType.replace(/_/g, " ")} • {currentQuestion?.question?.difficulty}
            </p>
          </div>
          {isAttempted && <Badge variant="success">Answered</Badge>}
        </CardHeader>
        <CardContent className="p-6">
          {/* ---- MCQ SINGLE ---- */}
          {(qType === "READING_MCQ_SINGLE" || qType === "LISTENING_MCQ_SINGLE" || qType === "HIGHLIGHT_CORRECT_SUMMARY" || qType === "SELECT_MISSING_WORD") && (
            <div className="space-y-4">
              {content?.passage && (
                <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-800">{content.passage}</div>
              )}
              {content?.question && <p className="font-medium text-gray-900">{content.question}</p>}
              <div className="space-y-2">
                {(content?.options || []).map((opt: string, i: number) => {
                  const isSelected = response === i;
                  const correct = content?.correctAnswers?.[0] ?? content?.correctAnswer;
                  const isCorrect = submitted && i === correct;
                  const isWrong = submitted && isSelected && i !== correct;
                  return (
                    <button
                      key={i}
                      onClick={() => !submitted && setResponse(i)}
                      disabled={submitted}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                        isCorrect ? "border-green-500 bg-green-50" :
                        isWrong ? "border-red-500 bg-red-50" :
                        isSelected ? "border-indigo-500 bg-indigo-50" :
                        "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                        isSelected || isCorrect ? "border-indigo-500 bg-indigo-600 text-white" : "border-gray-300 text-gray-500"
                      }`}>{String.fromCharCode(65 + i)}</span>
                      <span className="flex-1">{opt}</span>
                      {isCorrect && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                      {isWrong && <XCircle className="h-5 w-5 text-red-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- MCQ MULTIPLE ---- */}
          {(qType === "READING_MCQ_MULTIPLE" || qType === "LISTENING_MCQ_MULTIPLE") && (
            <div className="space-y-4">
              {content?.passage && (
                <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-800">{content.passage}</div>
              )}
              {content?.question && <p className="font-medium text-gray-900">{content.question}</p>}
              <p className="text-xs text-gray-500">Select all correct answers</p>
              <div className="space-y-2">
                {(content?.options || []).map((opt: string, i: number) => {
                  const selected: number[] = response || [];
                  const isSelected = selected.includes(i);
                  const isCorrect = submitted && content?.correctAnswers?.includes(i);
                  const isWrong = submitted && isSelected && !isCorrect;
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (submitted) return;
                        setResponse(isSelected ? selected.filter((s: number) => s !== i) : [...selected, i]);
                      }}
                      disabled={submitted}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                        isCorrect ? "border-green-500 bg-green-50" :
                        isWrong ? "border-red-500 bg-red-50" :
                        isSelected ? "border-indigo-500 bg-indigo-50" :
                        "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        isSelected ? "border-indigo-500 bg-indigo-600" : "border-gray-300"
                      }`}>{isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}</div>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ---- READ ALOUD ---- */}
          {qType === "READ_ALOUD" && (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-50 p-4 text-lg leading-relaxed text-gray-900">{content?.text}</div>
              <p className="text-sm text-gray-500">Read the text above aloud. (Audio recording in speaking module)</p>
            </div>
          )}

          {/* ---- WRITE ESSAY / SWT ---- */}
          {(qType === "WRITE_ESSAY" || qType === "SUMMARIZE_WRITTEN_TEXT") && (
            <div className="space-y-4">
              {content?.passage && (
                <div className="max-h-52 overflow-y-auto rounded-lg bg-gray-50 p-4 text-sm text-gray-800">{content.passage}</div>
              )}
              {content?.prompt && (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-800">{content.prompt}</div>
              )}
              <textarea
                className="min-h-[160px] w-full rounded-lg border border-gray-300 p-4 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder={qType === "WRITE_ESSAY" ? "Write your essay (200-300 words)..." : "Write a one-sentence summary (5-75 words)..."}
                value={response || ""}
                onChange={(e) => setResponse(e.target.value)}
                disabled={submitted}
              />
              <p className="text-xs text-gray-500">
                Words: {(response || "").trim().split(/\s+/).filter(Boolean).length}
              </p>
            </div>
          )}

          {/* ---- WRITE FROM DICTATION ---- */}
          {qType === "WRITE_FROM_DICTATION" && (
            <div className="space-y-4">
              {(content?.audioUrl || currentQuestion?.question?.audioUrl) && (
                <audio controls className="w-full" src={content?.audioUrl || currentQuestion?.question?.audioUrl} />
              )}
              <p className="text-sm text-gray-500">Listen and type the exact sentence you hear.</p>
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-gray-300 p-4 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Type what you hear..."
                value={response || ""}
                onChange={(e) => setResponse(e.target.value)}
                disabled={submitted}
              />
              {submitted && content?.correctText && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-800">Correct:</p>
                  <p className="text-sm text-green-900">{content.correctText}</p>
                </div>
              )}
            </div>
          )}

          {/* ---- REORDER PARAGRAPHS ---- */}
          {qType === "REORDER_PARAGRAPHS" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Arrange paragraphs in correct order:</p>
              {(() => {
                const paragraphs: string[] = content?.paragraphs || [];
                const order: number[] = response || paragraphs.map((_: string, i: number) => i);
                const moveUp = (idx: number) => {
                  if (idx <= 0 || submitted) return;
                  const n = [...order];
                  [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
                  setResponse(n);
                };
                const moveDown = (idx: number) => {
                  if (idx >= order.length - 1 || submitted) return;
                  const n = [...order];
                  [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
                  setResponse(n);
                };
                return (
                  <div className="space-y-2">
                    {order.map((paraIdx: number, pos: number) => {
                      const isCorrect = submitted && content?.correctOrder?.[pos] === paraIdx;
                      return (
                        <div key={`${paraIdx}-${pos}`} className={`flex items-start gap-3 rounded-lg border p-3 ${
                          submitted ? (isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") : "border-gray-200"
                        }`}>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">{pos + 1}</span>
                          <p className="flex-1 text-sm text-gray-800">{paragraphs[paraIdx]}</p>
                          {!submitted && (
                            <div className="flex flex-col gap-1">
                              <button onClick={() => moveUp(pos)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100">▲</button>
                              <button onClick={() => moveDown(pos)} className="rounded p-0.5 text-gray-400 hover:bg-gray-100">▼</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ---- FILL IN BLANKS DROPDOWN ---- */}
          {qType === "READING_FILL_BLANKS_DROPDOWN" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Select the correct word for each blank:</p>
              <div className="text-sm leading-relaxed text-gray-800">
                {(content?.passage || "").split("{{BLANK}}").map((part: string, i: number) => (
                  <span key={i}>
                    {part}
                    {i < (content?.blanks?.length || 0) && (
                      <select
                        className="mx-1 inline rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900"
                        value={(response || {})[i] || ""}
                        onChange={(e) => setResponse({ ...(response || {}), [i]: e.target.value })}
                        disabled={submitted}
                      >
                        <option value="">Select...</option>
                        {(content?.blanks?.[i]?.options || []).map((opt: string) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                  </span>
                ))}
              </div>
              {submitted && (
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-800">Correct answers:</p>
                  {content?.blanks?.map((b: any, i: number) => (
                    <span key={i} className="mr-2 text-sm text-green-900">Blank {i + 1}: <strong>{b.correctAnswer}</strong></span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---- SPEAKING / LISTENING PROMPT TYPES ---- */}
          {["REPEAT_SENTENCE", "DESCRIBE_IMAGE", "RETELL_LECTURE", "ANSWER_SHORT_QUESTION",
            "RESPOND_TO_SITUATION", "SUMMARIZE_SPOKEN_TEXT", "LISTENING_FILL_BLANKS",
            "READING_FILL_BLANKS_DRAG"].includes(qType) && (
            <div className="space-y-4">
              {content?.text && <div className="rounded-lg bg-amber-50 p-4 text-gray-900">{content.text}</div>}
              {content?.question && <p className="font-medium text-gray-900">{content.question}</p>}
              {content?.prompt && <p className="text-gray-800">{content.prompt}</p>}
              {content?.context && <p className="text-sm text-gray-600">{content.context}</p>}
              {(content?.audioUrl || currentQuestion?.question?.audioUrl) && (
                <audio controls className="w-full" src={content?.audioUrl || currentQuestion?.question?.audioUrl} />
              )}
              <p className="text-sm text-gray-500">Audio recording for speaking will be available in full version.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit + Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={goPrev} disabled={currentIdx === 0} className="gap-2">
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        <div>
          {!submitted && !isAttempted && (
            <Button onClick={submitAnswer} disabled={response === null && response !== 0}>
              Submit Answer
            </Button>
          )}
          {(submitted || isAttempted) && (
            <Badge variant="success" className="px-4 py-2">Answered</Badge>
          )}
        </div>

        <Button onClick={goNext} disabled={currentIdx === totalQuestions - 1} className="gap-2">
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
