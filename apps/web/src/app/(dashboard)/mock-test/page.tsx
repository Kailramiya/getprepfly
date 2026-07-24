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
  mockType: string;
  section: string | null;
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

type FilterType = "ALL" | "FULL" | "SPEAKING" | "WRITING" | "READING" | "LISTENING";

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
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    // Two parallel fetches instead of four — init batches assigned+templates+access
    fetchTests();
    fetch("/api/mock-tests/init")
      .then(r => r.json())
      .then(d => {
        if (!d.success) return;
        setAssignedTests(d.data.assigned);
        setGlobalTemplates(d.data.templates);
        setAccess(d.data.access);
      });
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

  const FILTERS: { id: FilterType; label: string; icon: any; color: string; active: string }[] = [
    { id: "ALL",       label: "All",       icon: ClipboardList, color: "text-gray-500",   active: "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900" },
    { id: "FULL",      label: "Full Test", icon: ClipboardList, color: "text-indigo-600", active: "bg-indigo-600 text-white" },
    { id: "SPEAKING",  label: "Speaking",  icon: Mic,           color: "text-teal-600",   active: "bg-teal-600 text-white" },
    { id: "WRITING",   label: "Writing",   icon: PenTool,       color: "text-blue-600",   active: "bg-blue-600 text-white" },
    { id: "READING",   label: "Reading",   icon: BookOpen,      color: "text-purple-600", active: "bg-purple-600 text-white" },
    { id: "LISTENING", label: "Listening", icon: Headphones,    color: "text-orange-600", active: "bg-orange-600 text-white" },
  ];

  const matchesFilter = (mockType: string, section: string | null) => {
    if (activeFilter === "ALL") return true;
    if (activeFilter === "FULL") return mockType === "FULL";
    return mockType === "SECTIONAL" && section === activeFilter;
  };

  const filteredTemplates = globalTemplates.filter(t => matchesFilter(t.mockType, t.section));
  const filteredTests     = tests.filter(t => matchesFilter(t.mockType, t.section));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground">Mock Tests</h1>
          <p className="mt-2 text-lg font-medium text-muted-foreground/80">Simulate the real PTE Academic exam</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {fullAccessLocked && (
            <span className="text-sm font-medium text-muted-foreground/80">
              Full tests need all 4 modules.{" "}
              <button onClick={() => router.push("/pricing")} className="font-bold text-primary hover:text-primary/80 transition-colors">
                Upgrade
              </button>
            </span>
          )}
          <Button
            onClick={startNewTest}
            loading={creating}
            size="xl"
            className={`gap-2 rounded-full shadow-glass hover:shadow-float transition-all duration-700 ease-fluid active:scale-[0.98] ${fullAccessLocked ? "bg-background text-foreground hover:bg-muted-foreground/5 border border-muted-foreground/20" : ""}`}
            variant={fullAccessLocked ? "outline" : "default"}
          >
            {fullAccessLocked ? <Lock className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
            {fullAccessLocked ? "Unlock Full Test" : "Start New Mock Test"}
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {FILTERS.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-500 ease-fluid shadow-sm hover:shadow-md active:scale-95 ${
                isActive
                  ? `shadow-primary/25 ${f.active}`
                  : "bg-background border-none ring-1 ring-muted-foreground/10 text-muted-foreground/70 hover:bg-muted-foreground/5 hover:text-foreground"
              }`}
            >
              <f.icon className={`h-4 w-4 ${isActive ? "opacity-100 drop-shadow-sm" : f.color}`} />
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Test Info Card */}
      <Card className="rounded-[2rem] border-none ring-1 ring-primary/20 bg-primary/5 shadow-glass backdrop-blur-xl overflow-hidden relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
        <CardContent className="p-6 sm:p-8 relative z-10">
          <div className="grid gap-6 sm:grid-cols-4">
            {[
              { icon: Mic, label: "Speaking", info: "28 questions", color: "text-teal-600 dark:text-teal-400", section: "SPEAKING" },
              { icon: PenTool, label: "Writing", info: "3 questions", color: "text-blue-600 dark:text-blue-400", section: "WRITING" },
              { icon: BookOpen, label: "Reading", info: "11 questions", color: "text-purple-600 dark:text-purple-400", section: "READING" },
              { icon: Headphones, label: "Listening", info: "14 questions", color: "text-orange-600 dark:text-orange-400", section: "LISTENING" },
            ].map((s) => {
              const sectionAccess = access?.hasAllAccess || access?.modules.includes(s.section);
              return (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-background/50 shadow-inner group-hover:scale-105 transition-transform duration-700 ease-fluid">
                    <s.icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <div>
                    <p className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-1.5">
                      {s.label}
                      {access && !sectionAccess && <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground/80 mt-0.5">{s.info}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-sm font-bold text-primary/80 uppercase tracking-wider">
            Full mock test: 56 questions across 4 sections <span className="mx-2 opacity-50">•</span> Estimated time: 2-3 hours <span className="mx-2 opacity-50">•</span> Purchase all 4 modules to unlock
          </p>
        </CardContent>
      </Card>

      {/* Assigned by Centre */}
      {assignedTests.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-foreground">Assigned by Your Centre</h2>
          <div className="space-y-4">
            {assignedTests.map(t => (
              <Card key={t.id} className="rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/5 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float">
                <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
                  <div>
                    <p className="text-xl font-extrabold tracking-tight text-foreground">{t.title}</p>
                    <p className="text-sm font-medium text-muted-foreground/80 mt-1">
                      Assigned {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <Button size="lg" onClick={() => router.push(`/mock-test/${t.id}`)} className="rounded-full shadow-sm hover:shadow-md transition-all duration-700 ease-fluid active:scale-[0.98]">
                    <Play className="h-5 w-5 mr-2 fill-current" /> Start Test
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Global Templates */}
      {filteredTemplates.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-foreground">Available Tests</h2>
          <div className="space-y-4">
            {filteredTemplates.map(t => {
              const accessible = canAccess(t);
              return (
                <Card key={t.id} className={`rounded-[1.5rem] border-none shadow-glass backdrop-blur-xl transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float ${accessible ? "bg-background/50 ring-1 ring-white/5" : "bg-muted-foreground/5 opacity-80"}`}>
                  <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-inner ${
                        !accessible ? "bg-muted-foreground/10 text-muted-foreground" :
                        t.mockType === "FULL" ? "bg-indigo-500/10 text-indigo-500" :
                        t.section === "SPEAKING" ? "bg-teal-500/10 text-teal-500" :
                        t.section === "WRITING" ? "bg-blue-500/10 text-blue-500" :
                        t.section === "READING" ? "bg-purple-500/10 text-purple-500" :
                        "bg-orange-500/10 text-orange-500"
                      }`}>
                        {!accessible ? <Lock className="h-6 w-6 text-muted-foreground/50" /> :
                         t.mockType === "FULL" ? <ClipboardList className="h-6 w-6 text-indigo-500" /> :
                         t.section === "SPEAKING" ? <Mic className="h-6 w-6 text-teal-500" /> :
                         t.section === "WRITING" ? <PenTool className="h-6 w-6 text-blue-500" /> :
                         t.section === "READING" ? <BookOpen className="h-6 w-6 text-purple-500" /> :
                         <Headphones className="h-6 w-6 text-orange-500" />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xl font-extrabold tracking-tight text-foreground">{t.title}</p>
                          {t.isFree && (
                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-none rounded-full shadow-sm font-bold transition-colors">
                              <Gift className="h-3 w-3 mr-1" /> Free
                            </Badge>
                          )}
                          {!accessible && (
                            <Badge variant="secondary" className="border-none rounded-full shadow-sm font-bold opacity-70">
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
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-foreground">Your Mock Tests</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        ) : filteredTests.length === 0 ? (
          <Card className="rounded-[2rem] border border-dashed border-muted-foreground/20 bg-background/30 shadow-none">
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/5 text-muted-foreground/30">
                <ClipboardList className="h-10 w-10" />
              </div>
              <div>
                <p className="text-xl font-extrabold tracking-tight text-foreground">
                  {tests.length === 0 ? "No mock tests yet" : `No ${activeFilter === "ALL" ? "" : activeFilter.toLowerCase() + " "}tests found`}
                </p>
                <p className="mt-2 text-sm font-medium text-muted-foreground/80">
                  {tests.length === 0 ? "Start your first one above to see your progress." : "Try changing your filters."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTests.map((test) => (
              <Card
                key={test.id}
                className="group cursor-pointer rounded-[1.5rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/5 transition-all duration-700 ease-fluid hover:-translate-y-1 hover:shadow-float"
                onClick={() => router.push(`/mock-test/${test.id}`)}
              >
                <CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 sm:p-6">
                  <div className="flex items-center gap-5">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.25rem] shadow-inner transition-transform duration-700 ease-fluid group-hover:scale-105 ${
                      test.status === "COMPLETED" ? "bg-green-500/10 text-green-500" :
                      test.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-500" : "bg-muted-foreground/10 text-muted-foreground"
                    }`}>
                      {test.status === "COMPLETED" ? (
                        <Trophy className="h-7 w-7" />
                      ) : (
                        <ClipboardList className="h-7 w-7" />
                      )}
                    </div>
                    <div>
                      <p className="text-xl font-extrabold tracking-tight text-foreground group-hover:text-primary transition-colors">{test.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-medium text-muted-foreground/80">
                        <span>{new Date(test.startedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        {test.totalTime && (
                          <>
                            <span className="opacity-50">•</span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {formatDuration(test.totalTime)}
                            </span>
                          </>
                        )}
                        <Badge className={`border-none rounded-full shadow-sm font-bold ml-2 ${
                          test.status === "COMPLETED" ? "bg-green-500/10 text-green-500" :
                          test.status === "IN_PROGRESS" ? "bg-amber-500/10 text-amber-500" : "bg-muted-foreground/10 text-muted-foreground"
                        }`}>
                          {test.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {test.overallScore !== null && (
                    <div className="hidden items-center gap-6 sm:flex rounded-2xl bg-muted-foreground/5 p-4">
                      {[
                        { label: "S", score: test.speakingScore, color: "text-teal-600 dark:text-teal-400" },
                        { label: "W", score: test.writingScore, color: "text-blue-600 dark:text-blue-400" },
                        { label: "R", score: test.readingScore, color: "text-purple-600 dark:text-purple-400" },
                        { label: "L", score: test.listeningScore, color: "text-orange-600 dark:text-orange-400" },
                      ].map((s) => (
                        <div key={s.label} className="text-center">
                          <p className="text-xs font-bold text-muted-foreground/50">{s.label}</p>
                          <p className={`text-lg font-extrabold tracking-tight ${s.color}`}>{s.score || "--"}</p>
                        </div>
                      ))}
                      <div className="border-l-2 border-muted-foreground/10 pl-6 text-center">
                        <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-widest">Overall</p>
                        <p className="text-2xl font-extrabold tracking-tight text-primary drop-shadow-sm">{test.overallScore}</p>
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
