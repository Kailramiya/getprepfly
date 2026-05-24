"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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
  correctAnswers: number;
  timeTaken: number | null;
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

  const estimatedPTE = data.overallScore ? Math.round(10 + (data.overallScore / 90) * 80) : null;

  return (
    <>
      {/* Print styles */}
      <style>{`@media print { .no-print { display: none !important; } body { background: white; } }`}</style>

      <div className="no-print mb-4 flex items-center gap-3">
        <Link href={`/mock-test/${testId}`}><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button></Link>
        <Button onClick={handlePrint} className="gap-2"><Printer className="h-4 w-4" /> Download / Print PDF</Button>
      </div>

      <div ref={reportRef} className="mx-auto max-w-2xl space-y-6 bg-white p-8 rounded-2xl border shadow-sm dark:bg-slate-800 dark:border-slate-700">
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

        {/* Overall Score */}
        <div className="rounded-2xl bg-indigo-600 p-6 text-white text-center">
          <p className="text-sm opacity-80 uppercase tracking-wide">Overall Score</p>
          <p className="text-6xl font-bold mt-1">{data.overallScore ?? "—"}<span className="text-2xl opacity-60">/90</span></p>
          {estimatedPTE && (
            <p className="mt-2 text-indigo-200">Estimated PTE Score: <span className="font-bold text-white">~{estimatedPTE}</span></p>
          )}
          <p className="mt-1 text-indigo-200">Band: <span className="font-semibold text-white">{pteBand(data.overallScore)}</span></p>
        </div>

        {/* Section Scores */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-4 dark:text-slate-200">Section Scores</h2>
          <div className="space-y-4">
            <ScoreBar label="Speaking" score={data.speakingScore} color="bg-teal-500" />
            <ScoreBar label="Writing" score={data.writingScore} color="bg-blue-500" />
            <ScoreBar label="Reading" score={data.readingScore} color="bg-purple-500" />
            <ScoreBar label="Listening" score={data.listeningScore} color="bg-orange-500" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 rounded-xl border p-4 text-center dark:border-slate-700">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.totalQuestions}</p>
            <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">Total Questions</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{data.correctAnswers}</p>
            <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">Correct</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {data.timeTaken ? `${Math.round(data.timeTaken / 60)}m` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 dark:text-slate-400">Time Taken</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-400 dark:border-slate-700 dark:text-slate-500">
          Generated by Prepfly · AI-Powered PTE Practice Platform · prepfly.in
        </div>
      </div>
    </>
  );
}
