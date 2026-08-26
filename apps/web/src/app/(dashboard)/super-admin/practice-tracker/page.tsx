"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Activity,
  type LucideIcon,
  Users,
  Building2,
  Clock,
  Flame,
  ClipboardList,
  Download,
  Search,
  ChevronRight,
  RefreshCw,
  Trophy,
  CalendarDays,
  Star,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirror /api/super-admin/practice-tracker response)
// ---------------------------------------------------------------------------
interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  attempts: number;
  timeSeconds: number;
  activeDays: number;
  streak: number;
  avgScore: number | null;
  mockTests: number;
  lastActive: string | null;
}

interface CentreRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  isActive: boolean;
  isPremiumCentre: boolean;
  premiumUntil: string | null;
  studentCount: number;
  activeStudents: number;
  attempts: number;
  timeSeconds: number;
  avgScore: number | null;
  mockTests: number;
  lastActive: string | null;
  users: UserRow[];
}

interface TrackerData {
  range: string;
  since: string | null;
  generatedAt: string;
  totals: {
    centres: number;
    activeCentres: number;
    students: number;
    activeStudents: number;
    attempts: number;
    timeSeconds: number;
    avgScore: number | null;
    mockTests: number;
  };
  centres: CentreRow[];
}

type RangeKey = "today" | "7d" | "30d" | "all";
const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "all", label: "All time" },
];

type SortKey = "attempts" | "time" | "avgScore" | "students" | "lastActive";
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "attempts", label: "Most practice" },
  { key: "time", label: "Most time" },
  { key: "students", label: "Most students" },
  { key: "avgScore", label: "Highest avg score" },
  { key: "lastActive", label: "Recently active" },
];

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function fmtDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "0m";
  const totalMin = Math.floor(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtHours(seconds: number): string {
  const h = seconds / 3600;
  if (h >= 10) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60 * 1000) return "Just now";
  if (diffMs < 60 * 60 * 1000) return `${Math.floor(diffMs / 60000)}m ago`;
  const days = Math.floor(diffMs / 86400000);
  if (diffMs < 24 * 60 * 60 * 1000) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function fmtScore(n: number | null): string {
  return n != null ? n.toFixed(1) : "—";
}

export default function PracticeTrackerPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  const [data, setData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("attempts");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (r: RangeKey) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/practice-tracker?range=${r}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load practice data");
      }
      setData(json.data as TrackerData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const toggleCentre = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const query = search.trim().toLowerCase();

  // Filter (by centre or student) + sort.
  const filteredCentres = useMemo(() => {
    if (!data) return [];
    let centres = data.centres;

    if (query) {
      centres = centres
        .map((c) => {
          const centreMatches =
            c.name.toLowerCase().includes(query) ||
            (c.city ?? "").toLowerCase().includes(query);
          const users = centreMatches
            ? c.users
            : c.users.filter(
                (u) =>
                  u.name.toLowerCase().includes(query) ||
                  u.email.toLowerCase().includes(query)
              );
          return { ...c, users, _matches: centreMatches || users.length > 0 };
        })
        .filter((c) => c._matches);
    }

    const sorted = [...centres].sort((a, b) => {
      switch (sortKey) {
        case "time":
          return b.timeSeconds - a.timeSeconds;
        case "students":
          return b.studentCount - a.studentCount;
        case "avgScore":
          return (b.avgScore ?? -1) - (a.avgScore ?? -1);
        case "lastActive":
          return (
            new Date(b.lastActive ?? 0).getTime() - new Date(a.lastActive ?? 0).getTime()
          );
        case "attempts":
        default:
          return b.attempts - a.attempts || b.studentCount - a.studentCount;
      }
    });
    return sorted;
  }, [data, query, sortKey]);

  const exportCSV = () => {
    if (!data) return;
    const headers = [
      "Centre",
      "City",
      "Student",
      "Email",
      "Active",
      "Attempts",
      "Time (min)",
      "Active days",
      "Streak (days)",
      "Avg score",
      "Mock tests",
      "Last active",
    ];
    const rows: string[][] = [];
    for (const c of data.centres) {
      for (const u of c.users) {
        rows.push([
          c.name,
          c.city ?? "",
          u.name,
          u.email,
          u.isActive ? "Yes" : "No",
          String(u.attempts),
          String(Math.round(u.timeSeconds / 60)),
          String(u.activeDays),
          String(u.streak),
          u.avgScore != null ? String(u.avgScore) : "",
          String(u.mockTests),
          u.lastActive ? new Date(u.lastActive).toLocaleString() : "",
        ]);
      }
    }
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = `practice-tracker-${data.range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(dlUrl);
  };

  const t = data?.totals;
  const statCards = t
    ? [
        {
          label: "Practice attempts",
          value: t.attempts.toLocaleString(),
          icon: Activity,
          color: "text-indigo-500",
          bg: "bg-indigo-50 dark:bg-indigo-950/40",
        },
        {
          label: "Practice time",
          value: fmtHours(t.timeSeconds),
          icon: Clock,
          color: "text-teal-500",
          bg: "bg-teal-50 dark:bg-teal-950/40",
        },
        {
          label: "Active students",
          value: `${t.activeStudents.toLocaleString()} / ${t.students.toLocaleString()}`,
          icon: Users,
          color: "text-amber-500",
          bg: "bg-amber-50 dark:bg-amber-950/40",
        },
        {
          label: "Active centres",
          value: `${t.activeCentres.toLocaleString()} / ${t.centres.toLocaleString()}`,
          icon: Building2,
          color: "text-purple-500",
          bg: "bg-purple-50 dark:bg-purple-950/40",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            Practice Tracker
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            How much every centre and student is practising
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Range segmented control */}
          <div className="flex items-center rounded-full bg-muted p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-300",
                  range === opt.key
                    ? "bg-primary text-primary-foreground shadow-glass"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchData(range)}
            className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
          <button
            onClick={exportCSV}
            disabled={!data || loading}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glass transition-all hover:opacity-90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {loading && !data ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : error ? (
        <Card className="rounded-[2rem] border-none shadow-glass ring-1 ring-white/10 bg-background/50">
          <CardContent className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => fetchData(range)}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card
                key={stat.label}
                className="relative overflow-hidden rounded-[2rem] border-none shadow-glass backdrop-blur-xl ring-1 ring-white/10 hover:-translate-y-1 hover:shadow-float transition-all duration-700 ease-fluid bg-background/50"
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                      stat.bg
                    )}
                  >
                    <stat.icon className={cn("h-7 w-7", stat.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-3xl font-bold text-gray-900 dark:text-slate-100">
                      {stat.value}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Controls: search + sort */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search centre or student…"
                className="w-full rounded-full border border-border bg-background/60 py-2.5 pl-9 pr-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by</span>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-full border border-border bg-background/60 px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-primary"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Centre list */}
          <div className="space-y-3">
            {filteredCentres.length === 0 ? (
              <Card className="rounded-[2rem] border-none shadow-glass ring-1 ring-white/10 bg-background/50">
                <CardContent className="p-10 text-center text-muted-foreground">
                  {query ? "No centres or students match your search." : "No centres yet."}
                </CardContent>
              </Card>
            ) : (
              filteredCentres.map((centre) => {
                const isOpen = expanded.has(centre.id) || (!!query && centre.users.length > 0);
                return (
                  <Card
                    key={centre.id}
                    className="overflow-hidden rounded-[2rem] border-none shadow-glass ring-1 ring-white/10 bg-background/50"
                  >
                    {/* Centre header row */}
                    <button
                      onClick={() => toggleCentre(centre.id)}
                      className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight
                          className={cn(
                            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
                            isOpen && "rotate-90"
                          )}
                        />
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
                          <Building2 className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-slate-100">
                              {centre.name}
                            </p>
                            {centre.isPremiumCentre && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                Premium
                              </span>
                            )}
                            {!centre.isActive && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {centre.city ? `${centre.city} · ` : ""}
                            {centre.activeStudents}/{centre.studentCount} students active
                          </p>
                        </div>
                      </div>

                      {/* Centre metric chips */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pl-8 lg:justify-end lg:pl-0">
                        <Metric icon={Activity} label="attempts" value={centre.attempts.toLocaleString()} />
                        <Metric icon={Clock} label="time" value={fmtDuration(centre.timeSeconds)} />
                        <Metric icon={Star} label="avg" value={fmtScore(centre.avgScore)} />
                        <Metric icon={ClipboardList} label="mocks" value={centre.mockTests.toLocaleString()} />
                        <Metric icon={CalendarDays} label="last" value={fmtRelative(centre.lastActive)} />
                      </div>
                    </button>

                    {/* Student drill-down */}
                    {isOpen && (
                      <div className="border-t border-border">
                        {centre.users.length === 0 ? (
                          <p className="p-5 text-sm text-muted-foreground">No students.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                              <thead>
                                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                                  <th className="px-5 py-3 font-semibold">Student</th>
                                  <th className="px-3 py-3 text-right font-semibold">Attempts</th>
                                  <th className="px-3 py-3 text-right font-semibold">Time</th>
                                  <th className="px-3 py-3 text-right font-semibold">Active days</th>
                                  <th className="px-3 py-3 text-right font-semibold">Streak</th>
                                  <th className="px-3 py-3 text-right font-semibold">Avg</th>
                                  <th className="px-3 py-3 text-right font-semibold">Mocks</th>
                                  <th className="px-5 py-3 text-right font-semibold">Last active</th>
                                </tr>
                              </thead>
                              <tbody>
                                {centre.users.map((u) => (
                                  <tr
                                    key={u.id}
                                    className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                                  >
                                    <td className="px-5 py-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900 dark:text-slate-100">
                                          {u.name}
                                        </span>
                                        {!u.isActive && (
                                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                                            inactive
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-xs text-muted-foreground">{u.email}</span>
                                    </td>
                                    <td className="px-3 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">
                                      {u.attempts.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-3 text-right text-muted-foreground">
                                      {fmtDuration(u.timeSeconds)}
                                    </td>
                                    <td className="px-3 py-3 text-right text-muted-foreground">
                                      {u.activeDays}
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      {u.streak > 0 ? (
                                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                          <Flame className="h-3.5 w-3.5" />
                                          {u.streak}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground">0</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-3 text-right text-muted-foreground">
                                      {fmtScore(u.avgScore)}
                                    </td>
                                    <td className="px-3 py-3 text-right text-muted-foreground">
                                      {u.mockTests}
                                    </td>
                                    <td className="px-5 py-3 text-right text-muted-foreground">
                                      {fmtRelative(u.lastActive)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {data && (
            <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" />
              Updated {fmtRelative(data.generatedAt)} · Showing{" "}
              {RANGE_OPTIONS.find((r) => r.key === (data.range as RangeKey))?.label ?? data.range}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Small metric chip used in the centre header.
function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
