import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

const MIN_ATTEMPTS = 5; // must practice a bit to appear on the board
const TOP_N = 20;

// Show only first name + last initial to peers (light privacy).
function displayName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// GET /api/leaderboard — average-score ranking of the student's centre.
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const centreId = user!.centreId;
  if (!centreId) {
    return NextResponse.json({ success: true, data: { available: false } });
  }

  // Average scored-attempt score per student in this centre.
  const grouped = await db.attempt.groupBy({
    by: ["userId"],
    where: { overallScore: { not: null }, user: { centreId, role: "STUDENT" } },
    _avg: { overallScore: true },
    _count: { _all: true },
  });

  const ranked = grouped
    .filter((g) => (g._count._all || 0) >= MIN_ATTEMPTS)
    .map((g) => ({ userId: g.userId, avgScore: Math.round(g._avg.overallScore || 0), attempts: g._count._all }))
    .sort((a, b) => b.avgScore - a.avgScore || b.attempts - a.attempts);

  // Names for the top N plus the caller (so we can show "your rank" if outside top).
  const neededIds = new Set(ranked.slice(0, TOP_N).map((r) => r.userId));
  neededIds.add(user!.id);
  const users = await db.user.findMany({
    where: { id: { in: Array.from(neededIds) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(users.map((u) => [u.id, u.name]));

  const top = ranked.slice(0, TOP_N).map((r, i) => ({
    rank: i + 1,
    name: displayName(nameById.get(r.userId) || "Student"),
    avgScore: r.avgScore,
    attempts: r.attempts,
    isYou: r.userId === user!.id,
  }));

  const myIndex = ranked.findIndex((r) => r.userId === user!.id);
  const you =
    myIndex >= 0
      ? { rank: myIndex + 1, avgScore: ranked[myIndex].avgScore, attempts: ranked[myIndex].attempts, ranked: true }
      : { rank: null, avgScore: 0, attempts: 0, ranked: false };

  return NextResponse.json({
    success: true,
    data: { available: true, totalRanked: ranked.length, minAttempts: MIN_ATTEMPTS, top, you },
  });
}
