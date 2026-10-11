"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThumbsDown, ThumbsUp, RefreshCw, ArrowRight, Flag } from "lucide-react";

interface FlaggedQuestion {
  id: string;
  flag: "WEAK" | "STRONG" | "REVIEW_AGAIN";
  question: {
    id: string;
    title: string;
    type: string;
    section: string;
    difficulty: string;
  };
}

// bg/border at low opacity (not the flat *-50 light-mode-only shades) so the
// icon badge keeps proper contrast against a dark card background too.
const FLAG_CONFIG = {
  WEAK: { label: "Weak", icon: ThumbsDown, color: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20" },
  REVIEW_AGAIN: { label: "Review Again", icon: RefreshCw, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20" },
  STRONG: { label: "Strong", icon: ThumbsUp, color: "text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20" },
};

// ?q=<id> tells the practice page to paginate straight to this specific
// question instead of always starting at page 1 of the type's whole list —
// see the matching effect in practice/[section]/[type]/page.tsx.
function sectionPath(section: string, type: string, questionId: string) {
  return `/practice/${section.toLowerCase()}/${type.toLowerCase()}?q=${questionId}`;
}

export default function MyFlagsPage() {
  const [flags, setFlags] = useState<FlaggedQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "WEAK" | "REVIEW_AGAIN" | "STRONG">("ALL");

  useEffect(() => {
    fetch("/api/questions/my-flags")
      .then(r => r.json())
      .then(d => { if (d.success) setFlags(d.data); })
      .finally(() => setLoading(false));
  }, []);

  const remove = async (questionId: string) => {
    await fetch("/api/questions/flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, flag: null }),
    });
    setFlags(prev => prev.filter(f => f.question.id !== questionId));
  };

  const visible = filter === "ALL" ? flags : flags.filter(f => f.flag === filter);
  const counts = { WEAK: flags.filter(f => f.flag === "WEAK").length, REVIEW_AGAIN: flags.filter(f => f.flag === "REVIEW_AGAIN").length, STRONG: flags.filter(f => f.flag === "STRONG").length };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Flagged Questions</h1>
        <p className="text-gray-500 dark:text-slate-400">Questions you marked for later review</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {([["ALL", "All", flags.length], ["WEAK", "Weak", counts.WEAK], ["REVIEW_AGAIN", "Review Again", counts.REVIEW_AGAIN], ["STRONG", "Strong", counts.STRONG]] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 rounded-full border-none shadow-sm px-4 py-1.5 text-sm font-medium transition-all duration-500 ease-fluid hover:-translate-y-0.5 active:scale-95 ${filter === key ? "bg-indigo-600 text-white shadow-indigo-500/25" : "bg-background/40 hover:bg-background/60 text-foreground ring-1 ring-muted-foreground/10"}`}
          >
            {label} <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${filter === key ? "bg-white/20 text-white" : "bg-foreground/5 text-muted-foreground"}`}>{count}</span>
          </button>
        ))}
      </div>

      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <Flag className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-gray-500">No {filter === "ALL" ? "" : filter.replace("_", " ").toLowerCase()} flagged questions yet.</p>
              <Link href="/practice/speaking"><Button className="mt-4 gap-2 rounded-full shadow-sm hover:shadow-md transition-all duration-700 ease-fluid active:scale-[0.98]">Start Practicing</Button></Link>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {visible.map(({ flag, question }) => {
                const cfg = FLAG_CONFIG[flag];
                const Icon = cfg.icon;
                return (
                  <div key={question.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${cfg.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900 dark:text-slate-100">{question.title}</p>
                        {/* flex-wrap — three badges plus a long question type
                            name don't fit one line on a phone-width card. */}
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs">{question.section}</Badge>
                          <Badge variant="secondary" className="text-xs">{question.type.replace(/_/g, " ")}</Badge>
                          <Badge variant={question.difficulty === "EASY" ? "success" : question.difficulty === "HARD" ? "destructive" : "secondary"} className="text-xs">{question.difficulty}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center justify-end gap-3 sm:justify-start sm:gap-2">
                      <button onClick={() => remove(question.id)} className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400">Remove</button>
                      <Link href={sectionPath(question.section, question.type, question.id)}>
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-full hover:-translate-y-1 active:scale-[0.98] transition-all duration-700 ease-fluid bg-transparent border-white/10">
                          Practice <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
