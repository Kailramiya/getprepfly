"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, TrendingUp, Target, Clock, Flame,
  ArrowUp, ArrowDown, Mic, PenTool, BookOpen, Headphones, ChevronRight,
} from "lucide-react";

const SECTION_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  SPEAKING: { icon: Mic, color: "text-teal-600", bg: "bg-teal-100" },
  WRITING: { icon: PenTool, color: "text-blue-600", bg: "bg-blue-100" },
  READING: { icon: BookOpen, color: "text-purple-600", bg: "bg-purple-100" },
  LISTENING: { icon: Headphones, color: "text-orange-600", bg: "bg-orange-100" },
};

export default function ProgressPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (result.success) setData(result.data);
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  if (!data) return null;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Your Progress</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Practice Streak", value: `${data.streak} days`, icon: Flame, color: "text-orange-500" },
          { label: "Questions Done", value: String(data.totalAttempts), icon: Target, color: "text-teal-500" },
          { label: "Avg Score", value: data.averageScore > 0 ? String(data.averageScore) : "--", icon: TrendingUp, color: "text-indigo-500" },
          { label: "Practice Time", value: formatTime(data.totalPracticeTime), icon: Clock, color: "text-purple-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-50 dark:bg-slate-700">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{stat.value}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Section-wise Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            Section-wise Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(data.scoresBySection).map(([section, score]) => {
              const config = SECTION_CONFIG[section];
              const SectionIcon = config?.icon || BarChart3;
              const numScore = score as number;

              return (
                <div key={section} className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${config?.bg || "bg-gray-100"}`}>
                      <SectionIcon className={`h-5 w-5 ${config?.color || "text-gray-500"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{section}</p>
                      <p className={`text-2xl font-bold ${
                        numScore >= 79 ? "text-green-600" :
                        numScore >= 65 ? "text-blue-600" :
                        numScore >= 50 ? "text-amber-600" :
                        numScore > 0 ? "text-red-600" : "text-gray-400"
                      }`}>
                        {numScore > 0 ? numScore : "--"}
                      </p>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-slate-700">
                    <div
                      className={`h-full rounded-full ${
                        numScore >= 79 ? "bg-green-500" :
                        numScore >= 65 ? "bg-blue-500" :
                        numScore >= 50 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min((numScore / 90) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Weak & Strong Areas */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Weak Areas */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDown className="h-4 w-4 text-red-500" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.weakAreas.length === 0 ? (
              <p className="text-sm text-gray-400">Practice more to see your weak areas</p>
            ) : (
              <div className="space-y-3">
                {data.weakAreas.map((area: any) => (
                  <div key={area.type} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {area.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{area.count} attempts</p>
                    </div>
                    <Badge variant="destructive">{area.averageScore}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Strong Areas */}
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUp className="h-4 w-4 text-green-500" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.strongAreas.length === 0 ? (
              <p className="text-sm text-gray-400">Practice more to see your strengths</p>
            ) : (
              <div className="space-y-3">
                {data.strongAreas.map((area: any) => (
                  <div key={area.type} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {area.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{area.count} attempts</p>
                    </div>
                    <Badge variant="success">{area.averageScore}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Practice</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentAttempts.length === 0 ? (
            <p className="text-sm text-gray-400">No practice activity yet. Start practicing!</p>
          ) : (
            <div className="space-y-2">
              {data.recentAttempts.map((attempt: any) => {
                const config = SECTION_CONFIG[attempt.section];
                return (
                  <Link
                    key={attempt.id}
                    href={`/progress/attempts/${attempt.id}`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${config?.bg || "bg-gray-200"}`}>
                        {config?.icon && <config.icon className={`h-4 w-4 ${config.color}`} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{attempt.title}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">
                          {attempt.questionType.replace(/_/g, " ")} &bull;{" "}
                          {new Date(attempt.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {attempt.score !== null && (
                        <span className={`text-sm font-bold ${
                          attempt.score >= 79 ? "text-green-600" :
                          attempt.score >= 50 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {Math.round(attempt.score)}/90
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-400 dark:text-slate-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
