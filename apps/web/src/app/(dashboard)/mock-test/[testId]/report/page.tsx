"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

function formatResponse(text: string | null): string | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed.answers && Array.isArray(parsed.answers)) return parsed.answers.join(", ");
    if (parsed.answer !== undefined) return String(parsed.answer);
    if (parsed.order && Array.isArray(parsed.order)) return parsed.order.join(" ➔ ");
    if (parsed.text !== undefined) return parsed.text;
    return text; // fallback to raw string if format not recognized
  } catch {
    return text; // wasn't JSON
  }
}

interface ReportData {
  id: string;
  title: string;
  completedAt: string | null;
  overallScore: number | null;
  speakingScore: number | null;
  writingScore: number | null;
  readingScore: number | null;
  listeningScore: number | null;
  totalQuestions: number;
  attempted: number;
  pending: number;
  timeTaken: number | null;
  attempts: any[];
}

function ScoreBar({ label, score, color }: { label: string; score: number | null; color: string }) {
  const pct = score ? Math.round((score / 90) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between mb-1 text-sm">
        <span className="font-medium text-gray-700 dark:text-slate-300">{label}</span>
        <span className="font-bold text-gray-900 dark:text-slate-100">{score ?? "—"}/90</span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-slate-700">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function pteBand(score: number | null): string {
  if (!score) return "—";
  if (score >= 79) return "Expert (C2)";
  if (score >= 65) return "Advanced (C1)";
  if (score >= 50) return "Upper-Intermediate (B2)";
  if (score >= 36) return "Intermediate (B1)";
  return "Beginner (A)";
}

export default function MockTestReportPage() {
  const { testId } = useParams() as { testId: string };
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/mock-tests/${testId}/report`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, [testId]);

  const handlePrint = () => window.print();

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!data) return <div className="py-20 text-center text-gray-500">Report not found.</div>;

  // Apply minimum floor for tests completed before the floor was introduced.
  const PTE_MIN = 22;
  const applyMin = (s: number | null) => (s === null ? null : Math.max(s, PTE_MIN));
  const overallScore   = applyMin(data.overallScore);
  const speakingScore  = applyMin(data.speakingScore);
  const writingScore   = applyMin(data.writingScore);
  const readingScore   = applyMin(data.readingScore);
  const listeningScore = applyMin(data.listeningScore);

  const estimatedPTE = overallScore ? Math.round(10 + (overallScore / 90) * 80) : null;

  const radarData = [
    { subject: 'Speaking', A: speakingScore || 0, fullMark: 90 },
    { subject: 'Writing', A: writingScore || 0, fullMark: 90 },
    { subject: 'Reading', A: readingScore || 0, fullMark: 90 },
    { subject: 'Listening', A: listeningScore || 0, fullMark: 90 },
  ];

  return (
    <>
      {/* Print styles */}
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="no-print mb-4 flex items-center gap-3">
        <Link href={`/mock-test/${testId}`}><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
        <Button onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Download / Print PDF</Button>
      </div>

      <div ref={reportRef} className="mx-auto max-w-4xl space-y-6">
        <div className="bg-white p-8 rounded-2xl border shadow-sm dark:bg-slate-800 dark:border-slate-700">
          {/* Header */}
          <div className="text-center border-b pb-6 dark:border-slate-700">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Prepfly PTE Score Report</h1>
            <p className="mt-1 text-gray-500 dark:text-slate-400">{data.title}</p>
            {data.completedAt && (
              <p className="mt-1 text-sm text-gray-400 dark:text-slate-500">
                Completed: {new Date(data.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="space-y-8">
              {/* Overall Score */}
              <div className="rounded-2xl bg-indigo-600 p-6 text-white text-center shadow-md">
                <p className="text-sm opacity-80 uppercase tracking-wide">Overall Score</p>
                <p className="text-6xl font-bold mt-1">{overallScore ?? "—"}<span className="text-2xl opacity-60">/90</span></p>
                {estimatedPTE && (
                  <p className="mt-2 text-indigo-200">Estimated PTE Score: <span className="font-bold text-white">~{estimatedPTE}</span></p>
                )}
                <p className="mt-1 text-indigo-200">Band: <span className="font-semibold text-white">{pteBand(overallScore)}</span></p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 rounded-xl border p-4 text-center dark:border-slate-700">
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.totalQuestions}</p>
                  <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">Total Questions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{data.attempted}</p>
                  <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">
                    Answered{data.pending > 0 ? ` · ${data.pending} pending scoring` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                    {data.timeTaken ? `${Math.round(data.timeTaken / 60)}m` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">Time Taken</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Radar Chart */}
              <div className="h-56 w-full flex justify-center items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 13, fontWeight: 500 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 90]} tick={false} axisLine={false} />
                    <Radar name="Student" dataKey="A" stroke="#6366f1" fill="#818cf8" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Section Scores */}
              <div>
                <h2 className="text-base font-semibold text-gray-800 mb-4 dark:text-slate-200 text-center">Skill Breakdown</h2>
                <div className="space-y-4 px-4">
                  <ScoreBar label="Speaking"  score={speakingScore}  color="bg-teal-500" />
                  <ScoreBar label="Writing"   score={writingScore}   color="bg-blue-500" />
                  <ScoreBar label="Reading"   score={readingScore}   color="bg-purple-500" />
                  <ScoreBar label="Listening" score={listeningScore} color="bg-orange-500" />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t pt-4 mt-8 text-center text-xs text-gray-400 dark:border-slate-700 dark:text-slate-500">
            Generated by Prepfly · AI-Powered PTE Practice Platform · prepfly.in
          </div>
        </div>

        {/* Detailed Question Review Accordion */}
        {data.attempts && data.attempts.length > 0 && (
          <div className="no-print mt-8 space-y-4 pb-12">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 pl-2">Detailed Question Review</h2>
            {data.attempts.map((attempt, idx) => (
              <details key={attempt.id} className="group border rounded-xl bg-white dark:bg-slate-800 dark:border-slate-700 overflow-hidden shadow-sm transition-all">
                <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-750 font-medium text-gray-900 dark:text-slate-100 outline-none">
                  <span className="font-semibold text-base">{idx + 1}. {attempt.question.type.replace(/_/g, " ")}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded-md font-bold">
                      Score: {attempt.overallScore != null ? Math.max(10, attempt.overallScore) : "—"}/90
                    </span>
                    <ChevronDown className="h-5 w-5 text-gray-400 transition-transform group-open:rotate-180" />
                  </div>
                </summary>
                <div className="p-6 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 space-y-6 text-sm text-gray-700 dark:text-slate-300">
                  <div>
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-slate-100 uppercase text-xs tracking-wider opacity-70">Prompt / Content</h4>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 leading-relaxed max-h-60 overflow-y-auto">
                      {attempt.question.content?.text || attempt.question.content?.transcript || attempt.question.title || "See original question for audio/media."}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-slate-100 uppercase text-xs tracking-wider opacity-70">Your Response</h4>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border dark:border-slate-700 leading-relaxed font-medium">
                      {formatResponse(attempt.responseText) || (attempt.responseAudio ? (
                        <audio src={attempt.responseAudio} controls className="w-full max-w-sm h-10" />
                      ) : <span className="italic text-gray-400">No response recorded</span>)}
                    </div>
                  </div>
                  {attempt.scores && Object.keys(attempt.scores).length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-indigo-600 dark:text-indigo-400 uppercase text-xs tracking-wider">AI Trait Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Render simple metrics like grammar, spelling visually */}
                        {["grammar", "spelling", "content", "fluency", "pronunciation", "vocabulary", "structure", "form"].map(trait => {
                          if (attempt.scores[trait] !== undefined) {
                            return (
                              <div key={trait} className="bg-white dark:bg-slate-800 p-3 rounded-lg border dark:border-slate-700 flex justify-between items-center">
                                <span className="capitalize">{trait}</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{attempt.scores[trait]}/90</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      {/* Render detailed feedback if available */}
                      {attempt.scores.feedback && (
                        <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30 text-indigo-900 dark:text-indigo-200">
                          <p className="font-semibold mb-1">Feedback</p>
                          <p>{attempt.scores.feedback}</p>
                        </div>
                      )}
                      
                      {/* Render objective mistakes if available */}
                      {attempt.scores.mistakes && attempt.scores.mistakes.length > 0 && (
                        <div className="mt-4">
                          <p className="font-semibold mb-2 text-red-600 dark:text-red-400">Mistakes</p>
                          <ul className="space-y-2">
                            {attempt.scores.mistakes.map((m: any, i: number) => (
                              <li key={i} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-3 rounded-lg text-red-800 dark:text-red-200">
                                <span className="font-semibold">Pos {m.position}:</span> You answered &quot;{m.yourAnswer}&quot;, expected &quot;{m.correctAnswer}&quot;
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
