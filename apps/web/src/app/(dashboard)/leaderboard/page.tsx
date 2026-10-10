"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Loader2, Medal, Building2, Globe2 } from "lucide-react";

interface Row {
  rank: number;
  name: string;
  avgScore: number;
  attempts: number;
  isYou: boolean;
}
interface Board {
  totalRanked: number;
  minAttempts: number;
  top: Row[];
  you: { rank: number | null; avgScore: number; attempts: number; ranked: boolean };
}
interface LeaderboardData {
  available: boolean;
  hasCentre: boolean;
  global: Board;
  centre: Board | null;
}

function rankBadge(rank: number) {
  if (rank === 1) return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  if (rank === 2) return "bg-gray-200 text-gray-700 dark:bg-slate-600 dark:text-slate-200";
  if (rank === 3) return "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300";
  return "bg-gray-50 text-gray-500 dark:bg-slate-700 dark:text-slate-400";
}

function BoardView({ board }: { board: Board }) {
  if (!board.top.length) {
    return (
      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardContent className="py-16 text-center">
          <Trophy className="mx-auto h-12 w-12 text-gray-300 dark:text-slate-600" />
          <p className="mt-4 text-gray-500 dark:text-slate-400">
            No ranked students yet. Practice at least {board.minAttempts} scored questions to be the first!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {board.you.ranked && board.you.rank && board.you.rank > board.top.length && (
        <Card className="rounded-[2rem] border-none shadow-glass bg-indigo-500/10 backdrop-blur-xl ring-1 ring-indigo-500/20 overflow-hidden">
          <CardContent className="flex items-center justify-between p-4">
            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Your rank</span>
            <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              #{board.you.rank} · {board.you.avgScore}/90 avg
            </span>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[2rem] border-none shadow-glass bg-background/50 backdrop-blur-xl ring-1 ring-white/10 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Medal className="h-5 w-5 text-amber-500" /> Top {board.top.length}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {board.top.map((row) => (
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
        Practice at least {board.minAttempts} scored questions to appear on the leaderboard.
      </p>
    </>
  );
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"centre" | "global">("centre");

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          setView(d.data.hasCentre ? "centre" : "global");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>;
  }

  const activeBoard = data && (view === "centre" && data.centre ? data.centre : data.global);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-slate-100">
            <Trophy className="h-6 w-6 text-amber-500" /> Leaderboard
          </h1>
          <p className="text-gray-500 dark:text-slate-400">
            {view === "centre" ? "Top students in your centre by average score." : "Top students across PrepFly by average score."}
          </p>
        </div>

        {data?.hasCentre && (
          <div className="flex gap-2 rounded-full bg-background/50 p-1 ring-1 ring-white/10 shadow-glass">
            <button
              onClick={() => setView("centre")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-500 ease-fluid ${view === "centre" ? "bg-indigo-500 text-white shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"}`}
            >
              <Building2 className="h-4 w-4" /> Your Centre
            </button>
            <button
              onClick={() => setView("global")}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all duration-500 ease-fluid ${view === "global" ? "bg-indigo-500 text-white shadow-sm" : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"}`}
            >
              <Globe2 className="h-4 w-4" /> Global
            </button>
          </div>
        )}
      </div>

      {activeBoard && <BoardView board={activeBoard} />}
    </div>
  );
}
