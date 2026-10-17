"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  IndianRupee,
  Phone,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
  Mic,
  PenTool,
  Volume2,
} from "lucide-react";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  calls: number;
  costInrPaise: number;
  promptTokens: number;
  completionTokens: number;
  audioSeconds: number;
  characters: number;
}

interface CentreRow {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  isActive: boolean;
  calls: number;
  costInrPaise: number;
  users: UserRow[];
}

interface UsageData {
  month: string;
  isCurrentMonth: boolean;
  generatedAt: string;
  totals: {
    calls: number;
    costInrPaise: number;
    byModel: { model: string; calls: number; costInrPaise: number }[];
  };
  centres: CentreRow[];
}

const MODEL_META: Record<string, { label: string; icon: typeof Mic }> = {
  "gpt-4o-mini": { label: "GPT-4o mini (scoring)", icon: PenTool },
  "whisper-1": { label: "Whisper (transcription)", icon: Mic },
  "tts-1": { label: "TTS (audio generation)", icon: Volume2 },
};

function fmtRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default function AiUsagePage() {
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (m: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/super-admin/usage?month=${m}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to load usage data");
      setData(json.data as UsageData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month);
  }, [month, fetchData]);

  const toggleCentre = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const query = search.trim().toLowerCase();
  const filteredCentres = useMemo(() => {
    if (!data) return [];
    if (!query) return data.centres;
    return data.centres
      .map((c) => {
        const centreMatches = c.name.toLowerCase().includes(query) || (c.city ?? "").toLowerCase().includes(query);
        const users = centreMatches ? c.users : c.users.filter((u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
        return { ...c, users };
      })
      .filter((c) => c.users.length > 0);
  }, [data, query]);

  const t = data?.totals;
  const statCards = t
    ? [
        {
          label: `Total LLM cost — ${monthLabel(data!.month)}`,
          value: fmtRupees(t.costInrPaise),
          icon: IndianRupee,
          color: "text-emerald-500",
          bg: "bg-emerald-50 dark:bg-emerald-950/40",
        },
        {
          label: "Total AI calls",
          value: t.calls.toLocaleString(),
          icon: Phone,
          color: "text-indigo-500",
          bg: "bg-indigo-50 dark:bg-indigo-950/40",
        },
        {
          label: "Centres with usage",
          value: data!.centres.length.toLocaleString(),
          icon: Building2,
          color: "text-purple-500",
          bg: "bg-purple-50 dark:bg-purple-950/40",
        },
        {
          label: "Students with usage",
          value: data!.centres.reduce((s, c) => s + c.users.length, 0).toLocaleString(),
          icon: Users,
          color: "text-amber-500",
          bg: "bg-amber-50 dark:bg-amber-950/40",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">AI Usage &amp; Cost</h1>
          <p className="text-gray-500 dark:text-slate-400">LLM API cost per centre and student, in Indian Rupees</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Month navigation */}
          <div className="flex items-center gap-1 rounded-full bg-muted p-1">
            <button
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[8.5rem] px-2 text-center text-sm font-semibold text-foreground">
              {monthLabel(month)}
            </span>
            <button
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={month >= currentMonthKey()}
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-30"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {month !== currentMonthKey() && (
            <button
              onClick={() => setMonth(currentMonthKey())}
              className="rounded-full border border-border bg-background/60 px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              This month
            </button>
          )}
          <button
            onClick={() => fetchData(month)}
            className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : error ? (
        <Card className="rounded-[2rem] border-none shadow-glass ring-1 ring-white/10 bg-background/50">
          <CardContent className="p-8 text-center">
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => fetchData(month)}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card
                key={stat.label}
                className="relative overflow-hidden rounded-[2rem] border-none shadow-glass backdrop-blur-xl ring-1 ring-white/10 hover:-translate-y-1 hover:shadow-float transition-all duration-700 ease-fluid bg-background/50"
              >
                <CardContent className="flex items-center gap-4 p-6">
                  <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl", stat.bg)}>
                    <stat.icon className={cn("h-7 w-7", stat.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-3xl font-bold text-gray-900 dark:text-slate-100">{stat.value}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Cost by model */}
          {t && t.byModel.length > 0 && (
            <Card className="rounded-[2rem] border-none shadow-glass ring-1 ring-white/10 bg-background/50">
              <CardContent className="flex flex-wrap items-center gap-6 p-5">
                <span className="text-sm font-semibold text-muted-foreground">By model</span>
                {t.byModel
                  .sort((a, b) => b.costInrPaise - a.costInrPaise)
                  .map((m) => {
                    const meta = MODEL_META[m.model] ?? { label: m.model, icon: IndianRupee };
                    return (
                      <div key={m.model} className="flex items-center gap-2">
                        <meta.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{meta.label}</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {fmtRupees(m.costInrPaise)}
                        </span>
                        <span className="text-xs text-muted-foreground">({m.calls.toLocaleString()} calls)</span>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search centre or student…"
              className="w-full rounded-full border border-border bg-background/60 py-2.5 pl-9 pr-4 text-sm text-foreground outline-none transition-colors focus:border-primary"
            />
          </div>

          {/* Centre list */}
          <div className="space-y-3">
            {filteredCentres.length === 0 ? (
              <Card className="rounded-[2rem] border-none shadow-glass ring-1 ring-white/10 bg-background/50">
                <CardContent className="p-10 text-center text-muted-foreground">
                  {query ? "No centres or students match your search." : `No AI usage recorded for ${monthLabel(month)}.`}
                </CardContent>
              </Card>
            ) : (
              filteredCentres.map((centre) => {
                const isOpen = expanded.has(centre.id) || (!!query && centre.users.length > 0);
                return (
                  <Card key={centre.id} className="overflow-hidden rounded-[2rem] border-none shadow-glass ring-1 ring-white/10 bg-background/50">
                    <button
                      onClick={() => toggleCentre(centre.id)}
                      className="flex w-full flex-col gap-3 p-5 text-left transition-colors hover:bg-muted/40 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronRight
                          className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300", isOpen && "rotate-90")}
                        />
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/40">
                          <Building2 className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-slate-100">{centre.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {centre.city ? `${centre.city} · ` : ""}
                            {centre.users.length} student{centre.users.length === 1 ? "" : "s"} with usage
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pl-8 lg:justify-end lg:pl-0">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{centre.calls.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">calls</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <IndianRupee className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-slate-100">{fmtRupees(centre.costInrPaise)}</span>
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[600px] text-sm">
                            <thead>
                              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <th className="px-5 py-3 font-semibold">Student</th>
                                <th className="px-3 py-3 text-right font-semibold">Calls</th>
                                <th className="px-5 py-3 text-right font-semibold">Cost</th>
                              </tr>
                            </thead>
                            <tbody>
                              {centre.users.map((u) => (
                                <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                                  <td className="px-5 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-900 dark:text-slate-100">{u.name}</span>
                                      {!u.isActive && (
                                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-slate-800 dark:text-slate-400">
                                          inactive
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-xs text-muted-foreground">{u.email}</span>
                                  </td>
                                  <td className="px-3 py-3 text-right text-muted-foreground">{u.calls.toLocaleString()}</td>
                                  <td className="px-5 py-3 text-right font-semibold text-gray-900 dark:text-slate-100">
                                    {fmtRupees(u.costInrPaise)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          {data && (
            <p className="pt-2 text-xs text-muted-foreground">
              Costs are estimated from OpenAI's published per-token/per-minute pricing at a fixed USD→INR rate, not pulled from an actual bill.
            </p>
          )}
        </>
      )}
    </div>
  );
}
