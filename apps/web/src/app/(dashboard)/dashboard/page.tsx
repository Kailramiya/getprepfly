"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnnouncementsBanner } from "@/components/dashboard/announcements-banner";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mic,
  PenTool,
  BookOpen,
  Headphones,
  ClipboardList,
  TrendingUp,
  Target,
  Clock,
  ArrowRight,
  Flame,
  Star,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";

function Sk({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 dark:bg-slate-700 ${className ?? ""}`} />;
}

interface DashboardData {
  totalAttempts: number;
  totalPracticeTime: number;
  streak: number;
  averageScore: number;
  estimatedPTEScore: number | null;
  scoresBySection: Record<string, number>;
  recentAttempts: Array<{
    id: string;
    questionType: string;
    section: string;
    title: string;
    score: number | null;
    createdAt: string;
  }>;
  weakAreas: Array<{ type: string; section: string; averageScore: number; count: number }>;
  strongAreas: Array<{ type: string; section: string; averageScore: number; count: number }>;
  predictions: Array<{ type: string; section: string; count: number }>;
  examDate: string | null;
  dailyGoal: number;
  todayCount: number;
}

const practiceCards = [
  {
    title: "Speaking",
    description: "Read Aloud, Repeat Sentence, Describe Image & more",
    icon: Mic,
    href: "/practice/speaking",
    color: "from-teal-500 to-teal-600",
    bgLight: "bg-teal-50",
    textColor: "text-teal-700",
    questions: 6,
  },
  {
    title: "Writing",
    description: "Summarize Written Text & Write Essay",
    icon: PenTool,
    href: "/practice/writing",
    color: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
    textColor: "text-blue-700",
    questions: 2,
  },
  {
    title: "Reading",
    description: "MCQ, Re-order Paragraphs & Fill in the Blanks",
    icon: BookOpen,
    href: "/practice/reading",
    color: "from-purple-500 to-purple-600",
    bgLight: "bg-purple-50",
    textColor: "text-purple-700",
    questions: 5,
  },
  {
    title: "Listening",
    description: "Summarize Spoken Text, Write from Dictation & more",
    icon: Headphones,
    href: "/practice/listening",
    color: "from-orange-500 to-orange-600",
    bgLight: "bg-orange-50",
    textColor: "text-orange-700",
    questions: 7,
  },
];

function formatTime(minutes: number): string {
  if (!minutes) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatType(t: string): string {
  return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    {
      label: "Practice Streak",
      value: loading ? null : `${data?.streak ?? 0} day${data?.streak === 1 ? "" : "s"}`,
      icon: Flame,
      color: "text-orange-500",
    },
    {
      label: "Questions Done",
      value: loading ? null : String(data?.totalAttempts ?? 0),
      icon: Target,
      color: "text-teal-500",
    },
    {
      label: "Avg Score",
      value: loading ? null : data?.averageScore ? `${data.averageScore}/90` : "--",
      icon: TrendingUp,
      color: "text-indigo-500",
    },
    {
      label: "Est. PTE Score",
      value: loading ? null : data?.estimatedPTEScore ? `~${data.estimatedPTEScore}` : "--",
      icon: Star,
      color: "text-amber-500",
      tooltip: "Estimated based on your section averages using PTE score weights",
    },
    {
      label: "Practice Time",
      value: loading ? null : formatTime(data?.totalPracticeTime ?? 0),
      icon: Clock,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Welcome back, {user?.name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="mt-1 text-gray-500 dark:text-slate-400">Continue your PTE preparation journey</p>
        </div>
        <Link href="/mock-test">
          <Button size="lg" className="gap-2">
            <ClipboardList className="h-5 w-5" />
            Start Mock Test
          </Button>
        </Link>
      </div>

      {/* Announcements */}
      <AnnouncementsBanner />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-800">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                {stat.value === null ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300 dark:text-slate-600" />
                ) : (
                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{stat.value}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Exam countdown + daily goal */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Sk className="h-16" /><Sk className="h-16" />
        </div>
      ) : data && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Exam-day countdown */}
          {(() => {
            if (!data.examDate) {
              return (
                <Card>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Set your exam date</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">Add it to see a countdown and stay on track.</p>
                    </div>
                    <Link href="/settings"><Button variant="outline" size="sm">Set date</Button></Link>
                  </CardContent>
                </Card>
              );
            }
            const days = Math.ceil((new Date(data.examDate).getTime() - Date.now()) / 86400000);
            return (
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                    <Clock className="h-6 w-6 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-slate-100">
                      {days > 0 ? `${days} day${days === 1 ? "" : "s"} to go` : days === 0 ? "Exam is today — good luck!" : "Exam date passed"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      PTE exam: {new Date(data.examDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      {" · "}<Link href="/settings" className="text-indigo-600 hover:underline dark:text-indigo-400">change</Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Daily goal progress */}
          {(() => {
            const goal = data.dailyGoal || 20;
            const done = data.todayCount || 0;
            const pct = Math.min(100, Math.round((done / goal) * 100));
            const met = done >= goal;
            return (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Today&apos;s goal</p>
                    <p className={`text-sm font-bold ${met ? "text-green-600" : "text-gray-900 dark:text-slate-100"}`}>
                      {done}/{goal}{met ? " ✓" : ""}
                    </p>
                  </div>
                  <div className="mt-2 h-2.5 w-full rounded-full bg-gray-100 dark:bg-slate-700">
                    <div className={`h-full rounded-full transition-all ${met ? "bg-green-500" : "bg-gradient-to-r from-teal-500 to-indigo-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-slate-400">
                    {met ? "Goal reached — keep your streak going!" : `${goal - done} more question${goal - done === 1 ? "" : "s"} to hit today's goal`}
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Practice Sections — Inspired by DSIC design with modern cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Practice by Section</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {practiceCards.map((card) => (
            <Link key={card.title} href={card.href}>
              <Card className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5">
                <CardContent className="p-0">
                  <div className="flex items-stretch">
                    {/* Icon section with gradient */}
                    <div className={`flex w-24 shrink-0 items-center justify-center bg-gradient-to-br ${card.color} sm:w-28`}>
                      <card.icon className="h-10 w-10 text-white" />
                    </div>
                    {/* Content */}
                    <div className="flex flex-1 items-center justify-between p-4">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">{card.title}</h3>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{card.description}</p>
                        <Badge variant="secondary" className="mt-2">
                          {card.questions} question types
                        </Badge>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-gray-300 dark:text-slate-600 transition group-hover:text-gray-600 dark:group-hover:text-slate-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Focus areas — personalized study plan from weakest question types */}
      {loading ? (
        <div>
          <Sk className="mb-4 h-6 w-48" />
          <div className="grid gap-3 sm:grid-cols-3"><Sk className="h-16" /><Sk className="h-16" /><Sk className="h-16" /></div>
        </div>
      ) : data && data.weakAreas.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Focus areas — practice these next</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {data.weakAreas.map((area) => (
              <Link key={area.type} href={`/practice/${area.section.toLowerCase()}`}>
                <Card className="group cursor-pointer transition hover:shadow-md">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{formatType(area.type)}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">Avg {area.averageScore}/90 · {area.count} attempts</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-indigo-500 dark:text-slate-600" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Prediction questions available */}
      {!loading && data && data.predictions.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100">High-frequency predictions</h2>
            <span className="text-xs text-gray-400 dark:text-slate-500">— expected in upcoming exams</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.predictions.map((p) => (
              <Link
                key={p.type}
                href={`/practice/${p.section.toLowerCase()}/${p.type.toLowerCase().replace(/_/g, "-")}`}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors">
                  <Zap className="h-3 w-3" />
                  {p.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  <span className="ml-0.5 rounded-full bg-amber-200 dark:bg-amber-800 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:text-amber-200">
                    {p.count}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attempts */}
      {loading ? (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Sk className="h-6 w-36" />
            <Sk className="h-4 w-16" />
          </div>
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Sk key={i} className="h-14" />)}
          </div>
        </div>
      ) : data && data.recentAttempts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Sparkles className="h-8 w-8 text-indigo-300" />
            <p className="font-semibold text-gray-900 dark:text-slate-100">No practice yet — let&apos;s start!</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Pick a section below and complete your first question.</p>
            <Link href="/practice/speaking"><Button size="sm" className="mt-1">Start practising</Button></Link>
          </CardContent>
        </Card>
      ) : data && data.recentAttempts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Recent Practice</h2>
            <Link href="/progress" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentAttempts.slice(0, 5).map((attempt) => (
              <Link key={attempt.id} href={`/progress/attempts/${attempt.id}`}>
                <Card className="cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white ${
                        attempt.section === "SPEAKING" ? "bg-teal-500" :
                        attempt.section === "WRITING" ? "bg-blue-500" :
                        attempt.section === "READING" ? "bg-purple-500" : "bg-orange-500"
                      }`}>
                        {attempt.section[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{attempt.title}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{formatType(attempt.questionType)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {attempt.score !== null ? (
                        <p className={`text-sm font-bold ${
                          attempt.score >= 70 ? "text-green-600" :
                          attempt.score >= 40 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {attempt.score}/90
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 dark:text-slate-500">Pending</p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {new Date(attempt.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/mock-test">
          <Card className="group cursor-pointer border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/40 transition hover:bg-indigo-100 dark:hover:bg-indigo-950/70">
            <CardContent className="flex items-center gap-4 p-5">
              <ClipboardList className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-300">Full Mock Test</h3>
                <p className="text-sm text-indigo-600 dark:text-indigo-400">Simulate the real PTE exam</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/study-guides">
          <Card className="group cursor-pointer border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-950/40 transition hover:bg-teal-100 dark:hover:bg-teal-950/70">
            <CardContent className="flex items-center gap-4 p-5">
              <Star className="h-8 w-8 text-teal-600 dark:text-teal-400" />
              <div>
                <h3 className="font-semibold text-teal-900 dark:text-teal-300">Study Guides</h3>
                <p className="text-sm text-teal-600 dark:text-teal-400">Tips & strategies for each section</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vocabulary">
          <Card className="group cursor-pointer border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/40 transition hover:bg-purple-100 dark:hover:bg-purple-950/70">
            <CardContent className="flex items-center gap-4 p-5">
              <BookOpen className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              <div>
                <h3 className="font-semibold text-purple-900 dark:text-purple-300">Vocabulary</h3>
                <p className="text-sm text-purple-600 dark:text-purple-400">Build your PTE word bank</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
