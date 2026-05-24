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

const FLAG_CONFIG = {
  WEAK: { label: "Weak", icon: ThumbsDown, color: "text-red-600 bg-red-50 border-red-200", badge: "destructive" as const },
  REVIEW_AGAIN: { label: "Review Again", icon: RefreshCw, color: "text-amber-600 bg-amber-50 border-amber-200", badge: "warning" as const },
  STRONG: { label: "Strong", icon: ThumbsUp, color: "text-green-600 bg-green-50 border-green-200", badge: "success" as const },
};

function sectionPath(section: string, type: string) {
  return `/practice/${section.toLowerCase()}/${type.toLowerCase()}`;
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
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition ${filter === key ? "bg-indigo-600 border-indigo-600 text-white" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-slate-600 dark:text-slate-300 dark:hover:border-slate-500"}`}
          >
            {label} <span className={`rounded-full px-1.5 py-0.5 text-xs ${filter === key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400"}`}>{count}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" /></div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <Flag className="mx-auto h-10 w-10 text-gray-300" />
              <p className="mt-3 text-gray-500">No {filter === "ALL" ? "" : filter.replace("_", " ").toLowerCase()} flagged questions yet.</p>
              <Link href="/practice/speaking"><Button variant="outline" className="mt-4">Start Practicing</Button></Link>
            </div>
          ) : (
            <div className="divide-y dark:divide-slate-700">
              {visible.map(({ flag, question }) => {
                const cfg = FLAG_CONFIG[flag];
                const Icon = cfg.icon;
                return (
                  <div key={question.id} className="flex items-center gap-4 p-4">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${cfg.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-900 dark:text-slate-100">{question.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{question.section}</Badge>
                        <Badge variant="secondary" className="text-xs">{question.type.replace(/_/g, " ")}</Badge>
                        <Badge variant={question.difficulty === "EASY" ? "success" : question.difficulty === "HARD" ? "destructive" : "secondary"} className="text-xs">{question.difficulty}</Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => remove(question.id)} className="text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400">Remove</button>
                      <Link href={sectionPath(question.section, question.type)}>
                        <Button size="sm" variant="outline" className="gap-1.5">
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
