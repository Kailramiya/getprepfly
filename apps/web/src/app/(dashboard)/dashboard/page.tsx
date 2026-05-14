"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
} from "lucide-react";

interface DashboardData {
  totalAttempts: number;
  totalPracticeTime: number;
  streak: number;
  averageScore: number;
  scoresBySection: Record<string, number>;
  recentAttempts: Array<{
    id: string;
    questionType: string;
    section: string;
    title: string;
    score: number | null;
    createdAt: string;
  }>;
  weakAreas: Array<{ type: string; averageScore: number; count: number }>;
  strongAreas: Array<{ type: string; averageScore: number; count: number }>;
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
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(" ")[0] || "Student"}!
          </h1>
          <p className="mt-1 text-gray-500">Continue your PTE preparation journey</p>
        </div>
        <Link href="/mock-test">
          <Button size="lg" className="gap-2">
            <ClipboardList className="h-5 w-5" />
            Start Mock Test
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                {stat.value === null ? (
                  <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
                ) : (
                  <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                )}
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Practice Sections — Inspired by DSIC design with modern cards */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Practice by Section</h2>
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
                        <h3 className="text-base font-semibold text-gray-900">{card.title}</h3>
                        <p className="mt-0.5 text-xs text-gray-500">{card.description}</p>
                        <Badge variant="secondary" className="mt-2">
                          {card.questions} question types
                        </Badge>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-gray-600 group-hover:translate-x-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Attempts */}
      {!loading && data && data.recentAttempts.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Practice</h2>
            <Link href="/progress" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {data.recentAttempts.slice(0, 5).map((attempt) => (
              <Card key={attempt.id}>
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
                      <p className="text-sm font-medium text-gray-900">{attempt.title}</p>
                      <p className="text-xs text-gray-500">{formatType(attempt.questionType)}</p>
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
                      <p className="text-xs text-gray-400">Pending</p>
                    )}
                    <p className="text-xs text-gray-400">
                      {new Date(attempt.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/mock-test">
          <Card className="group cursor-pointer border-indigo-200 bg-indigo-50 transition hover:bg-indigo-100">
            <CardContent className="flex items-center gap-4 p-5">
              <ClipboardList className="h-8 w-8 text-indigo-600" />
              <div>
                <h3 className="font-semibold text-indigo-900">Full Mock Test</h3>
                <p className="text-sm text-indigo-600">Simulate the real PTE exam</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/study-guides">
          <Card className="group cursor-pointer border-teal-200 bg-teal-50 transition hover:bg-teal-100">
            <CardContent className="flex items-center gap-4 p-5">
              <Star className="h-8 w-8 text-teal-600" />
              <div>
                <h3 className="font-semibold text-teal-900">Study Guides</h3>
                <p className="text-sm text-teal-600">Tips & strategies for each section</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vocabulary">
          <Card className="group cursor-pointer border-purple-200 bg-purple-50 transition hover:bg-purple-100">
            <CardContent className="flex items-center gap-4 p-5">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-purple-900">Vocabulary</h3>
                <p className="text-sm text-purple-600">Build your PTE word bank</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
