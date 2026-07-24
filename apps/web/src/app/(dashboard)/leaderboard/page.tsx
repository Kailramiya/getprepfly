"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Loader2, Medal } from "lucide-react";

interface Row {
  rank: number;
  name: string;
  avgScore: number;
  attempts: number;
  isYou: boolean;
}
interface LeaderboardData {
  available: boolean;
  totalRanked?: number;
  minAttempts?: number;
  top?: Row[];
  you?: { rank: number | null; avgScore: number; attempts: number; ranked: boolean };
}

function rankBadge(rank: number) {
  if (rank === 1) return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  if (rank === 2) return "bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200";
  if (rank === 3) return "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300";
  return "bg-gray-50 text-gray-500 dark:bg-slate-700 dark:text-slate-400";
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
          <Trophy className="h-6 w-6 text-amber-500" /> Leaderboard
        </h1>
        <p className="text-gray-500 dark:text-slate-400">Top students in your centre by average score.</p>
      </div>

      {!data?.available ? (
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
          <CardContent className="py-16 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
            <p className="mt-4 text-gray-500 dark:text-slate-400">
              The leaderboard is available once you join a coaching centre.
            </p>
          </CardContent>
        </Card>
      ) : (data.top && data.top.length > 0) ? (
        <>
          {/* Your rank (if outside the visible top) */}
          {data.you && data.you.ranked && data.you.rank && data.you.rank > (data.top.length) && (
            <Card className="rounded-[2rem] border-none shadow-glass bg-indigo-500/10 backdrop-blur-xl ring-1 ring-indigo-500/20 overflow-hidden">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Your rank</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  #{data.you.rank} · {data.you.avgScore}/90 avg
                </span>
              </CardContent>
            </Card>
          )}

          <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Medal className="h-5 w-5 text-amber-500" /> Top {data.top.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {data.top.map((row) => (
                  <div
                    key={row.rank}
                    className={`flex items-center gap-4 px-4 py-3 transition-colors ${row.isYou ? "bg-indigo-500/10" : "hover:bg-background/40"}`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankBadge(row.rank)}`}>
                      {row.rank}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {row.name}{row.isYou && <span className="ml-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">You</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{row.attempts} questions practiced</p>
                    </div>
                    <span className="text-sm font-bold text-gray-900 dark:text-slate-100">{row.avgScore}<span className="text-xs text-gray-400">/90</span></span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-gray-400 dark:text-slate-500">
            Practice at least {data.minAttempts} questions to appear on the leaderboard.
          </p>
        </>
      ) : (
        <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
          <CardContent className="py-16 text-center">
            <Trophy className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
            <p className="mt-4 text-gray-500 dark:text-slate-400">
              No ranked students yet. Practice at least {data.minAttempts ?? 5} questions to be the first!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
