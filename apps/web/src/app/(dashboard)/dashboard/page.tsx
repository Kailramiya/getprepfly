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
  assignedTests: Array<{ id: string; title: string; createdAt: string }>;
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

function formatTime(seconds: number): string {
  if (!seconds) return "0m";
  const minutes = Math.floor(seconds / 60);
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
      color: (data?.streak ?? 0) > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400",
      bgLight: (data?.streak ?? 0) > 0 ? "bg-orange-100 dark:bg-orange-950/40" : "bg-gray-100 dark:bg-slate-800",
      isStreak: true,
    },
    {
      label: "Questions Done",
      value: loading ? null : String(data?.totalAttempts ?? 0),
      icon: Target,
      color: "text-teal-600 dark:text-teal-400",
      bgLight: "bg-teal-100 dark:bg-teal-950/40",
    },
    {
      label: "Avg Score",
      value: loading ? null : data?.averageScore ? `${data.averageScore}/90` : "--",
      icon: TrendingUp,
      color: "text-indigo-600 dark:text-indigo-400",
      bgLight: "bg-indigo-100 dark:bg-indigo-950/40",
    },
    {
      label: "Est. PTE Score",
      value: loading ? null : data?.estimatedPTEScore ? `~${data.estimatedPTEScore}` : "--",
      icon: Star,
      color: "text-amber-600 dark:text-amber-400",
      bgLight: "bg-amber-100 dark:bg-amber-950/40",
      tooltip: "Estimated based on your section averages using PTE score weights",
    },
    {
      label: "Practice Time",
      value: loading ? null : formatTime(data?.totalPracticeTime ?? 0),
      icon: Clock,
      color: "text-purple-600 dark:text-purple-400",
      bgLight: "bg-purple-100 dark:bg-purple-950/40",
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* Welcome Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Welcome back, {user?.name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="mt-2 text-lg font-medium text-muted-foreground/80">Continue your PTE preparation journey</p>
        </div>
        <Link href="/mock-test">
          <Button size="xl" className="gap-2 rounded-full shadow-glass hover:shadow-float transition-all duration-700 ease-fluid active:scale-[0.98]">
            <ClipboardList className="h-5 w-5" />
            Start Mock Test
          </Button>
        </Link>
      </div>

      {/* Announcements */}
      <AnnouncementsBanner />

      {/* Assigned Mock Tests Alert */}
      {!loading && data?.assignedTests && data.assignedTests.length > 0 && (
        <div className="rounded-[2rem] border-none bg-indigo-500/10 ring-1 ring-indigo-500/20 p-6 sm:p-8 shadow-glass backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute -top-12 -right-12 p-4 opacity-10 group-hover:scale-110 transition-transform duration-700 ease-fluid group-hover:rotate-12 group-hover:opacity-20 text-indigo-500">
            <ClipboardList className="h-48 w-48" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-indigo-500" />
                <h3 className="text-2xl font-extrabold tracking-tight text-foreground">
                  You have {data.assignedTests.length} new assigned Mock Test{data.assignedTests.length > 1 ? "s" : ""}!
                </h3>
              </div>
              <p className="mt-2 text-base font-medium text-muted-foreground">
                Your Centre Admin has assigned practice tests for your batch.
              </p>
            </div>
            <Link href="/mock-test">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full border-none shadow-md hover:shadow-lg transition-all duration-700 ease-fluid active:scale-[0.98]">
                View Tests <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className={`rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 hover:shadow-float transition-all duration-700 ease-fluid hover:-translate-y-1 relative overflow-hidden ${stat.isStreak && (data?.streak ?? 0) > 0 ? "ring-orange-500/30" : ""}`}>
            {stat.isStreak && (data?.streak ?? 0) > 0 && (
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-red-500 opacity-80" />
            )}
            <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1rem] shadow-inner ${stat.bgLight}`}>
                <stat.icon className={`h-7 w-7 ${stat.color} ${stat.isStreak && (data?.streak ?? 0) > 0 ? "animate-pulse" : ""}`} />
              </div>
              <div>
                {stat.value === null ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
                ) : (
                  <p className="text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                )}
                <p className="mt-1 text-sm font-semibold text-muted-foreground/80 uppercase tracking-widest">{stat.label}</p>
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
                <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden">
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 sm:p-8">
                    <div>
                      <p className="text-xl font-extrabold tracking-tight text-foreground">Set your exam date</p>
                      <p className="mt-1 text-sm font-medium text-muted-foreground/80">Add it to see a countdown and stay on track.</p>
                    </div>
                    <Link href="/settings">
                      <Button variant="outline" size="lg" className="rounded-full shadow-sm hover:shadow-md transition-all duration-700 ease-fluid active:scale-[0.98]">
                        Set date
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            }
            const days = Math.ceil((new Date(data.examDate).getTime() - Date.now()) / 86400000);
            return (
              <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
                <CardContent className="flex items-center gap-5 p-6 sm:p-8 relative z-10">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.25rem] bg-indigo-500/10 shadow-inner group-hover:scale-105 transition-transform duration-700 ease-fluid">
                    <Clock className="h-8 w-8 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold tracking-tight text-foreground">
                      {days > 0 ? `${days} day${days === 1 ? "" : "s"} to go` : days === 0 ? "Exam is today — good luck!" : "Exam date passed"}
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground/80">
                      PTE exam: {new Date(data.examDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                      <span className="mx-2 opacity-50">·</span>
                      <Link href="/settings" className="font-bold text-indigo-500 hover:text-indigo-400 transition-colors">change</Link>
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
              <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 relative overflow-hidden group">
                <CardContent className="p-6 sm:p-8 flex flex-col justify-center h-full">
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-extrabold tracking-tight text-foreground">Today&apos;s goal</p>
                    <p className={`text-2xl font-extrabold tracking-tight ${met ? "text-green-500" : "text-foreground"}`}>
                      {done}/{goal}{met ? " ✓" : ""}
                    </p>
                  </div>
                  <div className="mt-4 h-3 w-full rounded-full bg-black/5 dark:bg-white/5 overflow-hidden shadow-inner">
                    <div className={`h-full rounded-full transition-all duration-1000 ease-fluid ${met ? "bg-green-500" : "bg-gradient-to-r from-teal-500 to-indigo-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-4 text-sm font-medium text-muted-foreground/80">
                    {met ? "Goal reached — keep your streak going!" : `${goal - done} more question${goal - done === 1 ? "" : "s"} to hit today's goal`}
                    <span className="mx-2 opacity-50">·</span>
                    <Link href="/settings" className="font-bold text-indigo-500 hover:text-indigo-400 transition-colors">change</Link>
                  </p>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* Practice Sections — Inspired by DSIC design with modern cards */}
      <div>
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-foreground">Practice by Section</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {practiceCards.map((card) => (
            <Link key={card.title} href={card.href} className="outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[2.5rem]">
              <Card className="group cursor-pointer overflow-hidden transition-all duration-700 ease-fluid hover:shadow-float hover:-translate-y-1 rounded-[2.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10">
                <CardContent className="p-0">
                  <div className="flex items-stretch h-full">
                    {/* Icon section with gradient */}
                    <div className={`relative flex w-32 shrink-0 items-center justify-center bg-gradient-to-br ${card.color} overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                      <card.icon className="h-12 w-12 text-white group-hover:scale-110 transition-transform duration-700 ease-fluid drop-shadow-md" />
                    </div>
                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-center p-6 relative">
                      <div className="absolute top-1/2 right-6 -translate-y-1/2">
                        <ArrowRight className="h-6 w-6 shrink-0 text-muted-foreground/30 transition-all duration-700 ease-fluid group-hover:text-foreground group-hover:translate-x-2" />
                      </div>
                      <div className="pr-8">
                        <h3 className="text-xl font-extrabold tracking-tight text-foreground">{card.title}</h3>
                        <p className="mt-1.5 text-sm font-medium text-muted-foreground/80 leading-relaxed">{card.description}</p>
                        <Badge variant="secondary" className="mt-4 rounded-full font-bold px-3 py-1 shadow-sm">
                          {card.questions} question types
                        </Badge>
                      </div>
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
          <Sk className="mb-4 h-8 w-48 rounded-full" />
          <div className="grid gap-4 sm:grid-cols-3"><Sk className="h-20 rounded-[1.5rem]" /><Sk className="h-20 rounded-[1.5rem]" /><Sk className="h-20 rounded-[1.5rem]" /></div>
        </div>
      ) : data && data.weakAreas.length > 0 && (
        <div>
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-foreground">Focus areas — practice these next</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {data.weakAreas.map((area) => (
              <Link key={area.type} href={`/practice/${area.section.toLowerCase()}`}>
                <Card className="group cursor-pointer rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/5 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float">
                  <CardContent className="flex items-center justify-between p-5">
                    <div>
                      <p className="text-base font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">{formatType(area.type)}</p>
                      <p className="text-xs font-medium text-muted-foreground/80 mt-1">Avg {area.averageScore}/90 <span className="mx-1 opacity-50">·</span> {area.count} attempts</p>
                    </div>
                    <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground/30 transition-all duration-700 ease-fluid group-hover:translate-x-1 group-hover:text-primary" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Prediction questions available */}
      {!loading && data && data.predictions.length > 0 && (
        <div className="rounded-[2rem] border-none shadow-glass bg-amber-500/5 ring-1 ring-amber-500/10 p-6 sm:p-8 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-500">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">High-frequency predictions</h2>
              <span className="text-sm font-medium text-muted-foreground/80">Expected in upcoming exams</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {data.predictions.map((p) => (
              <Link
                key={p.type}
                href={`/practice/${p.section.toLowerCase()}/${p.type.toLowerCase().replace(/_/g, "-")}?prediction=true`}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 hover:scale-105 transition-all duration-500 ease-fluid cursor-pointer">
                  <Zap className="h-4 w-4" />
                  {p.type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
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
          <div className="mb-6 flex items-center justify-between">
            <Sk className="h-8 w-48 rounded-full" />
            <Sk className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Sk key={i} className="h-20 rounded-[1.5rem]" />)}
          </div>
        </div>
      ) : data && data.recentAttempts.length === 0 ? (
        <Card className="rounded-[2rem] border border-dashed border-muted-foreground/20 bg-background/30 shadow-none">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-8 w-8" />
            </div>
            <p className="text-xl font-extrabold tracking-tight text-foreground">No practice yet — let&apos;s start!</p>
            <p className="text-sm font-medium text-muted-foreground/80">Pick a section below and complete your first question.</p>
            <Link href="/practice/speaking"><Button size="lg" className="mt-4 rounded-full shadow-glass hover:shadow-float transition-all duration-700 ease-fluid">Start practising</Button></Link>
          </CardContent>
        </Card>
      ) : data && data.recentAttempts.length > 0 && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Recent Practice</h2>
            <Link href="/progress" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 group">
              View all <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {data.recentAttempts.slice(0, 5).map((attempt) => (
              <Link key={attempt.id} href={`/progress/attempts/${attempt.id}`}>
                <Card className="cursor-pointer rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/5 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float">
                  <CardContent className="flex items-center justify-between p-4 sm:p-5">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-white shadow-inner ${
                        attempt.section === "SPEAKING" ? "bg-gradient-to-br from-teal-400 to-teal-600" :
                        attempt.section === "WRITING" ? "bg-gradient-to-br from-blue-400 to-blue-600" :
                        attempt.section === "READING" ? "bg-gradient-to-br from-purple-400 to-purple-600" : "bg-gradient-to-br from-orange-400 to-orange-600"
                      }`}>
                        {attempt.section[0]}
                      </div>
                      <div>
                        <p className="text-base font-extrabold tracking-tight text-foreground">{attempt.title}</p>
                        <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider mt-0.5">{formatType(attempt.questionType)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {attempt.score !== null ? (
                        <p className={`text-xl font-extrabold tracking-tight ${
                          attempt.score >= 70 ? "text-green-500" :
                          attempt.score >= 40 ? "text-amber-500" : "text-red-500"
                        }`}>
                          {attempt.score}<span className="text-sm font-bold text-muted-foreground/50">/90</span>
                        </p>
                      ) : (
                        <p className="text-sm font-bold text-muted-foreground/50">Pending</p>
                      )}
                      <p className="text-xs font-medium text-muted-foreground/60 mt-1">
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
          <Card className="group cursor-pointer rounded-[2rem] border-none shadow-glass bg-indigo-500/5 backdrop-blur-xl ring-1 ring-indigo-500/20 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float hover:bg-indigo-500/10">
            <CardContent className="flex flex-col items-center text-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-500 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
                <ClipboardList className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-foreground">Full Mock Test</h3>
                <p className="mt-2 text-sm font-medium text-muted-foreground/80">Simulate the real PTE exam</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/study-guides">
          <Card className="group cursor-pointer rounded-[2rem] border-none shadow-glass bg-teal-500/5 backdrop-blur-xl ring-1 ring-teal-500/20 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float hover:bg-teal-500/10">
            <CardContent className="flex flex-col items-center text-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-500/20 text-teal-500 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
                <Star className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-foreground">Study Guides</h3>
                <p className="mt-2 text-sm font-medium text-muted-foreground/80">Tips & strategies for each section</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vocabulary">
          <Card className="group cursor-pointer rounded-[2rem] border-none shadow-glass bg-purple-500/5 backdrop-blur-xl ring-1 ring-purple-500/20 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float hover:bg-purple-500/10">
            <CardContent className="flex flex-col items-center text-center gap-4 p-8">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20 text-purple-500 shadow-inner group-hover:scale-110 transition-transform duration-700 ease-fluid">
                <BookOpen className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight text-foreground">Vocabulary</h3>
                <p className="mt-2 text-sm font-medium text-muted-foreground/80">Build your PTE word bank</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
