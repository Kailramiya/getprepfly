"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Target, TrendingUp, Mic, PenTool, BookOpen, Headphones, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface StudentProgress {
  student: { id: string; name: string; email: string; phone: string | null; createdAt: string; studentPlan: { planType: string } | null };
  totalAttempts: number;
  averageScore: number;
  scoresBySection: Record<string, number>;
  recentAttempts: Array<{ id: string; questionType: string; section: string; title: string; score: number | null; createdAt: string }>;
  mockTests: Array<{ score: number | null; date: string | null }>;
}

const SECTION_ICONS = { SPEAKING: Mic, WRITING: PenTool, READING: BookOpen, LISTENING: Headphones };
const SECTION_COLORS = { SPEAKING: "text-teal-600 bg-teal-50", WRITING: "text-blue-600 bg-blue-50", READING: "text-purple-600 bg-purple-50", LISTENING: "text-orange-600 bg-orange-50" };

function formatType(t: string) { return t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

export default function StudentProgressPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<StudentProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/centres/students/${params.studentId}/progress`)
      .then(r => r.json())
      .then(res => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, [params.studentId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  if (!data) return <div className="py-20 text-center text-gray-500">Student not found.</div>;

  const { student, totalAttempts, averageScore, scoresBySection, recentAttempts, mockTests } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
          <p className="text-gray-500">{student.email} {student.phone && `· ${student.phone}`}</p>
        </div>
        <Badge variant={student.studentPlan?.planType === "FREE" ? "secondary" : "success"} className="ml-auto">
          {student.studentPlan?.planType || "FREE"}
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total Attempts", value: totalAttempts, icon: Target, color: "text-teal-600" },
          { label: "Avg Score", value: averageScore ? `${averageScore}/90` : "—", icon: TrendingUp, color: "text-indigo-600" },
          { label: "Mock Tests", value: mockTests.length, icon: CheckCircle2, color: "text-purple-600" },
          { label: "Joined", value: new Date(student.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }), icon: User, color: "text-gray-600" },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <stat.icon className={`h-8 w-8 shrink-0 ${stat.color}`} />
              <div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section Scores */}
      <Card>
        <CardHeader><CardTitle className="text-base">Score by Section</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Object.entries(scoresBySection).map(([section, score]) => {
              const Icon = SECTION_ICONS[section as keyof typeof SECTION_ICONS];
              const colorClass = SECTION_COLORS[section as keyof typeof SECTION_COLORS];
              return (
                <div key={section} className={`rounded-xl p-4 ${colorClass.split(" ")[1]}`}>
                  <div className={`flex items-center gap-2 ${colorClass.split(" ")[0]}`}>
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase">{section}</span>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-gray-900">{score > 0 ? `${score}/90` : "—"}</p>
                  {score > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-white/60">
                      <div className={`h-full rounded-full ${colorClass.split(" ")[0].replace("text", "bg")}`} style={{ width: `${(score / 90) * 100}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Attempts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Practice (last 20)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {recentAttempts.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-500">No practice attempts yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Question</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Score</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentAttempts.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{a.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs">{formatType(a.questionType)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        {a.score !== null ? (
                          <span className={`font-semibold ${a.score >= 60 ? "text-green-600" : a.score >= 30 ? "text-amber-600" : "text-red-600"}`}>
                            {a.score}/90
                          </span>
                        ) : <span className="text-gray-400">Pending</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
