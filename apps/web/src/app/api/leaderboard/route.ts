import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { rankByScore } from "@/lib/leaderboard-rank";

export const dynamic = "force-dynamic";

const MIN_ATTEMPTS = 5; // must practice a bit to appear on the board
const TOP_N = 20;

// Show only first name + last initial to peers (light privacy).
function displayName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// GET /api/leaderboard — average-score ranking.
// Individual (no-centre) students see only the global board. Centre students
// see both: their centre's board and the global board.
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const centreId = user!.centreId;

  // Ranks the caller among all scored STUDENT attempts matching extraWhere.
  async function buildBoard(extraWhere: Record<string, unknown>) {
    const grouped = await db.attempt.groupBy({
      by: ["userId"],
      where: { overallScore: { not: null }, user: { role: "STUDENT", ...extraWhere } },
      // Filters the >=MIN_ATTEMPTS threshold in SQL rather than fetching every
      // one-time dabbler across the whole platform just to drop them in JS —
      // matters most for the global board, which otherwise scans every student.
      having: { overallScore: { _count: { gte: MIN_ATTEMPTS } } },
      _avg: { overallScore: true },
      _count: { _all: true },
    });

    const ranked = rankByScore(
      grouped.map((g) => ({ userId: g.userId, rawAvg: g._avg.overallScore || 0, attempts: g._count._all }))
    );

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

    return { totalRanked: ranked.length, minAttempts: MIN_ATTEMPTS, top, you };
  }

  const [global, centre] = await Promise.all([
    buildBoard({}),
    centreId ? buildBoard({ centreId }) : Promise.resolve(null),
  ]);

  const res = NextResponse.json({
    success: true,
    data: { available: true, hasCentre: !!centreId, global, centre },
  });
  // Same strategy as /api/dashboard: paint instantly from a short-lived
  // per-user cache, revalidate in the background. "private" matters here —
  // the response embeds this caller's own "you"/"isYou" view, not just the
  // shared ranking, so it must never be served to a different user.
  res.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=300");
  res.headers.set("Vary", "Cookie");
  return res;
}
