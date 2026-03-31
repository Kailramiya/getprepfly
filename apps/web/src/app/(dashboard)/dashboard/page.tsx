"use client";

import Link from "next/link";
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
} from "lucide-react";

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

export default function DashboardPage() {
  const { user } = useAuth();

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
        {[
          { label: "Practice Streak", value: "0 days", icon: Flame, color: "text-orange-500" },
          { label: "Questions Done", value: "0", icon: Target, color: "text-teal-500" },
          { label: "Avg Score", value: "--", icon: TrendingUp, color: "text-indigo-500" },
          { label: "Practice Time", value: "0h", icon: Clock, color: "text-purple-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
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
