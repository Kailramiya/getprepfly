"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Play, Clock, Trophy,
  Mic, PenTool, BookOpen, Headphones,
} from "lucide-react";

interface MockTestSummary {
  id: string;
  title: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalTime: number | null;
  speakingScore: number | null;
  writingScore: number | null;
  readingScore: number | null;
  listeningScore: number | null;
  overallScore: number | null;
  _count: { questions: number; attempts: number };
}

export default function MockTestPage() {
  const router = useRouter();
  const [tests, setTests] = useState<MockTestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    const res = await fetch("/api/mock-tests");
    const data = await res.json();
    if (data.success) setTests(data.data);
    setLoading(false);
  };

  const startNewTest = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/mock-tests", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        router.push(`/mock-test/${data.data.id}`);
      }
    } catch {
      alert("Failed to create test. Please try again.");
    }
    setCreating(false);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mock Tests</h1>
          <p className="text-gray-500">Simulate the real PTE Academic exam</p>
        </div>
        <Button onClick={startNewTest} loading={creating} size="lg" className="gap-2">
          <Play className="h-5 w-5" />
          Start New Mock Test
        </Button>
      </div>

      {/* Test Info Card */}
      <Card className="border-indigo-200 bg-indigo-50">
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { icon: Mic, label: "Speaking", info: "28 questions", color: "text-teal-600" },
              { icon: PenTool, label: "Writing", info: "3 questions", color: "text-blue-600" },
              { icon: BookOpen, label: "Reading", info: "11 questions", color: "text-purple-600" },
              { icon: Headphones, label: "Listening", info: "14 questions", color: "text-orange-600" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.info}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-indigo-700">
            Full mock test: 56 questions across 4 sections. Estimated time: 2-3 hours.
          </p>
        </CardContent>
      </Card>

      {/* Past Tests */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Your Mock Tests</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          </div>
        ) : tests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-300" />
              <p className="mt-4 text-gray-500">No mock tests yet. Start your first one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <Card
                key={test.id}
                className="cursor-pointer transition hover:shadow-md"
                onClick={() => router.push(`/mock-test/${test.id}`)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      test.status === "COMPLETED" ? "bg-green-100" :
                      test.status === "IN_PROGRESS" ? "bg-amber-100" : "bg-gray-100"
                    }`}>
                      {test.status === "COMPLETED" ? (
                        <Trophy className="h-6 w-6 text-green-600" />
                      ) : (
                        <ClipboardList className="h-6 w-6 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{test.title}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                        <span>{new Date(test.startedAt).toLocaleDateString("en-IN")}</span>
                        {test.totalTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(test.totalTime)}
                          </span>
                        )}
                        <Badge variant={
                          test.status === "COMPLETED" ? "success" :
                          test.status === "IN_PROGRESS" ? "warning" : "secondary"
                        }>
                          {test.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Scores */}
                  {test.overallScore !== null && (
                    <div className="hidden items-center gap-4 sm:flex">
                      {[
                        { label: "S", score: test.speakingScore, color: "text-teal-600" },
                        { label: "W", score: test.writingScore, color: "text-blue-600" },
                        { label: "R", score: test.readingScore, color: "text-purple-600" },
                        { label: "L", score: test.listeningScore, color: "text-orange-600" },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <p className="text-xs text-gray-400">{s.label}</p>
                          <p className={`text-sm font-bold ${s.color}`}>{s.score || "--"}</p>
                        </div>
                      ))}
                      <div className="border-l border-gray-200 pl-4 text-center">
                        <p className="text-xs text-gray-400">Overall</p>
                        <p className="text-lg font-bold text-indigo-600">{test.overallScore}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
