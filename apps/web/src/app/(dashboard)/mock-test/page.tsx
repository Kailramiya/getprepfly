"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Play, Clock, Trophy,
  Mic, PenTool, BookOpen, Headphones, Lock, Gift,
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

interface GlobalTemplate {
  id: string;
  title: string;
  mockType: string;
  section: string | null;
  isFree: boolean;
  _count: { questions: number };
}

interface AccessData {
  hasAllAccess: boolean;
  modules: string[];
  isTrial?: boolean;
  trialExpired?: boolean;
}

export default function MockTestPage() {
  const router = useRouter();
  const [tests, setTests] = useState<MockTestSummary[]>([]);
  const [assignedTests, setAssignedTests] = useState<{ id: string; title: string; createdAt: string }[]>([]);
  const [globalTemplates, setGlobalTemplates] = useState<GlobalTemplate[]>([]);
  const [access, setAccess] = useState<AccessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTests();
    fetch("/api/mock-tests/assigned").then(r => r.json()).then(d => { if (d.success) setAssignedTests(d.data); });
    fetch("/api/mock-tests/global-templates").then(r => r.json()).then(d => { if (d.success) setGlobalTemplates(d.data); });
    fetch("/api/access/me").then(r => r.json()).then(d => { if (d.success) setAccess(d.data); });
  }, []);

  const fetchTests = async () => {
    const res = await fetch("/api/mock-tests");
    const data = await res.json();
    if (data.success) setTests(data.data);
    setLoading(false);
  };

  // Determine if a template is accessible to this user
  const canAccess = (t: GlobalTemplate): boolean => {
    if (t.isFree) return true;
    if (!access) return false;
    if (access.hasAllAccess) return true;
    if (t.mockType === "SECTIONAL" && t.section) return access.modules.includes(t.section);
    return false;
  };

  const canStartFullTest = (): boolean => {
    if (!access) return false;
    return access.hasAllAccess;
  };

  const startNewTest = async () => {
    if (!canStartFullTest()) {
      router.push("/pricing");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/mock-tests", { method: "POST" });
      const data = await res.json();
      if (data.success) router.push(`/mock-test/${data.data.id}`);
      else alert(data.error || "Failed to create test. Please try again.");
    } catch {
      alert("Failed to create test. Please try again.");
    }
    setCreating(false);
  };

  const startTemplate = async (template: GlobalTemplate) => {
    if (!canAccess(template)) {
      router.push("/pricing");
      return;
    }
    setStartingId(template.id);
    try {
      const res = await fetch("/api/mock-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: template.id }),
      });
      const data = await res.json();
      if (data.success) router.push(`/mock-test/${data.data.id}`);
      else alert(data.error || "Failed to start test");
    } catch {
      alert("Failed to start test. Please try again.");
    }
    setStartingId(null);
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const fullAccessLocked = access !== null && !access.hasAllAccess;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Mock Tests</h1>
          <p className="text-gray-500 dark:text-slate-400">Simulate the real PTE Academic exam</p>
        </div>
        <div className="flex items-center gap-3">
          {fullAccessLocked && (
            <span className="text-sm text-gray-500 dark:text-slate-400">
              Full tests need all 4 modules.{" "}
              <button onClick={() => router.push("/pricing")} className="text-indigo-600 underline dark:text-indigo-400">
                Upgrade
              </button>
            </span>
          )}
          <Button
            onClick={startNewTest}
            loading={creating}
            size="lg"
            className="gap-2"
            variant={fullAccessLocked ? "outline" : "default"}
          >
            {fullAccessLocked ? <Lock className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            {fullAccessLocked ? "Unlock Full Test" : "Start New Mock Test"}
          </Button>
        </div>
      </div>

      {/* Test Info Card */}
      <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30">
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { icon: Mic, label: "Speaking", info: "28 questions", color: "text-teal-600", section: "SPEAKING" },
              { icon: PenTool, label: "Writing", info: "3 questions", color: "text-blue-600", section: "WRITING" },
              { icon: BookOpen, label: "Reading", info: "11 questions", color: "text-purple-600", section: "READING" },
              { icon: Headphones, label: "Listening", info: "14 questions", color: "text-orange-600", section: "LISTENING" },
            ].map((s) => {
              const sectionAccess = access?.hasAllAccess || access?.modules.includes(s.section);
              return (
                <div key={s.label} className="flex items-center gap-3">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-slate-100 flex items-center gap-1">
                      {s.label}
                      {access && !sectionAccess && <Lock className="h-3 w-3 text-gray-400" />}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{s.info}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-indigo-700 dark:text-indigo-400">
            Full mock test: 56 questions across 4 sections. Estimated time: 2-3 hours. Purchase all 4 modules to unlock.
          </p>
        </CardContent>
      </Card>

      {/* Assigned by Centre */}
      {assignedTests.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-slate-100">Assigned by Your Centre</h2>
          <div className="space-y-2">
            {assignedTests.map(t => (
              <Card key={t.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-slate-100">{t.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 dark:text-slate-500">
                      Assigned {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => router.push(`/mock-test/${t.id}`)}>
                    <Play className="h-4 w-4 mr-1" /> Start
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Global Templates */}
      {globalTemplates.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-slate-100">Available Tests</h2>
          <div className="space-y-2">
            {globalTemplates.map(t => {
              const accessible = canAccess(t);
              return (
                <Card key={t.id} className={accessible ? "" : "opacity-80"}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        !accessible ? "bg-gray-100 dark:bg-slate-700" :
                        t.mockType === "FULL" ? "bg-indigo-100 dark:bg-indigo-950/50" :
                        t.section === "SPEAKING" ? "bg-teal-100 dark:bg-teal-950/50" :
                        t.section === "WRITING" ? "bg-blue-100 dark:bg-blue-950/50" :
                        t.section === "READING" ? "bg-purple-100 dark:bg-purple-950/50" :
                        "bg-orange-100 dark:bg-orange-950/50"
                      }`}>
                        {!accessible ? <Lock className="h-5 w-5 text-gray-400" /> :
                         t.mockType === "FULL" ? <ClipboardList className="h-5 w-5 text-indigo-600" /> :
                         t.section === "SPEAKING" ? <Mic className="h-5 w-5 text-teal-600" /> :
                         t.section === "WRITING" ? <PenTool className="h-5 w-5 text-blue-600" /> :
                         t.section === "READING" ? <BookOpen className="h-5 w-5 text-purple-600" /> :
                         <Headphones className="h-5 w-5 text-orange-600" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{t.title}</p>
                          {t.isFree && (
                            <Badge className="bg-green-600 text-white gap-1 text-xs py-0">
                              <Gift className="h-3 w-3" /> Free
                            </Badge>
                          )}
                          {!accessible && (
                            <Badge variant="secondary" className="text-xs py-0">
                              {t.mockType === "FULL" ? "Needs all 4 modules" : `Needs ${t.section?.toLowerCase()} module`}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {t.mockType === "FULL" ? "Full Mock Test" : `Sectional — ${t.section}`} · {t._count.questions} questions
                        </p>
                      </div>
                    </div>
                    {accessible ? (
                      <Button size="sm" loading={startingId === t.id} onClick={() => startTemplate(t)}>
                        <Play className="h-4 w-4 mr-1" /> Start
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => router.push("/pricing")}>
                        <Lock className="h-4 w-4 mr-1" /> Unlock
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Tests */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-slate-100">Your Mock Tests</h2>
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
                      <p className="font-medium text-gray-900 dark:text-slate-100">{test.title}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
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

                  {test.overallScore !== null && (
                    <div className="hidden items-center gap-4 sm:flex">
                      {[
                        { label: "S", score: test.speakingScore, color: "text-teal-600" },
                        { label: "W", score: test.writingScore, color: "text-blue-600" },
                        { label: "R", score: test.readingScore, color: "text-purple-600" },
                        { label: "L", score: test.listeningScore, color: "text-orange-600" },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <p className="text-xs text-gray-400 dark:text-slate-500">{s.label}</p>
                          <p className={`text-sm font-bold ${s.color}`}>{s.score || "--"}</p>
                        </div>
                      ))}
                      <div className="border-l border-gray-200 pl-4 text-center dark:border-slate-600">
                        <p className="text-xs text-gray-400 dark:text-slate-500">Overall</p>
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
