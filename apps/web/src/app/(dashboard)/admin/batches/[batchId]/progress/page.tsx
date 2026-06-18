"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart2, Users, CheckCircle2, Clock } from "lucide-react";

interface StudentStat {
  userId: string;
  name: string;
  email: string;
  totalAttempts: number;
  testsStarted: number;
  testsCompleted: number;
  testsInProgress: number;
  avgScore: number | null;
  lastTestAt: string | null;
}

interface Template {
  id: string;
  title: string;
  createdAt: string;
  _count: { questions: number };
}

interface BatchProgress {
  batch: { id: string; name: string; memberCount: number };
  templates: Template[];
  students: StudentStat[];
  summary: {
    totalMembers: number;
    startedAny: number;
    completedAny: number;
  };
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 dark:text-slate-500 text-sm">—</span>;
  const color = score >= 79 ? "text-emerald-600 dark:text-emerald-400"
    : score >= 65 ? "text-indigo-600 dark:text-indigo-400"
    : score >= 50 ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";
  return <span className={`font-bold text-sm ${color}`}>{score}</span>;
}

export default function BatchProgressPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const [data, setData] = useState<BatchProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) return;
    fetch(`/api/centres/batches/${batchId}/progress`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setData(d.data);
        else setError(d.error || "Failed to load progress");
      })
      .catch(() => setError("Failed to load progress"))
      .finally(() => setLoading(false));
  }, [batchId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/batches" className="flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400">
          <ArrowLeft className="h-4 w-4" /> Batches
        </Link>
        <span className="text-gray-300 dark:text-slate-600">/</span>
        <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
          {data?.batch.name ?? "Progress"}
        </span>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      )}
      {error && (
        <Card>
          <CardContent className="py-12 text-center text-red-500">{error}</CardContent>
        </Card>
      )}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-gray-300 dark:text-slate-600" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Total Members</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.summary.totalMembers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-8 w-8 text-amber-300 dark:text-amber-700" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Started a Test</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.summary.startedAny}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {data.summary.totalMembers > 0 ? Math.round(data.summary.startedAny / data.summary.totalMembers * 100) : 0}% of batch
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-300 dark:text-emerald-700" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400">Completed a Test</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{data.summary.completedAny}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {data.summary.totalMembers > 0 ? Math.round(data.summary.completedAny / data.summary.totalMembers * 100) : 0}% of batch
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Assigned Mock Tests */}
          {data.templates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart2 className="h-4 w-4 text-gray-400" />
                  Assigned Mock Tests ({data.templates.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-slate-700 px-4 py-2.5">
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{t.title}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-400 dark:text-slate-500">{t._count.questions} questions</span>
                        <Badge variant="secondary">{new Date(t.createdAt).toLocaleDateString("en-IN")}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-student progress table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {data.students.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-slate-500 py-8">No students in this batch yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-slate-700">
                        <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">Student</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-slate-400">Practice</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-slate-400">Tests Started</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-slate-400">Completed</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-slate-400">In Progress</th>
                        <th className="pb-3 text-center font-medium text-gray-500 dark:text-slate-400">Avg Score</th>
                        <th className="pb-3 text-left font-medium text-gray-500 dark:text-slate-400">Last Active</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                      {data.students.map(s => (
                        <tr key={s.userId} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-xs font-bold text-indigo-600 dark:text-indigo-300">
                                {s.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-slate-100">{s.name}</p>
                                <p className="text-xs text-gray-400 dark:text-slate-500">{s.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-center text-gray-600 dark:text-slate-400">{s.totalAttempts}</td>
                          <td className="py-3 text-center">
                            {s.testsStarted > 0
                              ? <span className="font-medium text-gray-900 dark:text-slate-100">{s.testsStarted}</span>
                              : <span className="text-gray-300 dark:text-slate-600">0</span>}
                          </td>
                          <td className="py-3 text-center">
                            {s.testsCompleted > 0
                              ? <span className="font-medium text-emerald-600 dark:text-emerald-400">{s.testsCompleted}</span>
                              : <span className="text-gray-300 dark:text-slate-600">0</span>}
                          </td>
                          <td className="py-3 text-center">
                            {s.testsInProgress > 0
                              ? <span className="font-medium text-amber-500 dark:text-amber-400">{s.testsInProgress}</span>
                              : <span className="text-gray-300 dark:text-slate-600">0</span>}
                          </td>
                          <td className="py-3 text-center">
                            <ScoreBadge score={s.avgScore} />
                          </td>
                          <td className="py-3 text-xs text-gray-400 dark:text-slate-500">
                            {s.lastTestAt
                              ? new Date(s.lastTestAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
