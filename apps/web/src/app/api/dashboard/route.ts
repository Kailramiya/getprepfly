import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

// GET /api/dashboard — student dashboard stats
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const userId = user!.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // All queries in parallel — no sequential round-trips
  const [
    totalAttempts,
    recentAttempts,
    mockTests,
    weeklyScores,
    profile,
    todayCount,
    totalPracticeTime,
    practiceDays,
    sectionTypeAggs,
    predictionsAgg,
    memberships,
  ] = await Promise.all([
    // Total attempts count
    db.attempt.count({ where: { userId } }),

    // Recent attempts (last 10)
    db.attempt.findMany({
      where: { userId },
      select: {
        id: true,
        overallScore: true,
        createdAt: true,
        question: { select: { type: true, section: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Completed mock tests (last 10)
    db.mockTest.findMany({
      where: { userId, status: "COMPLETED" },
      select: { overallScore: true, completedAt: true },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),

    // Score trend (last 30 days) — small set, used for chart
    db.attempt.findMany({
      where: { userId, overallScore: { not: null }, createdAt: { gte: thirtyDaysAgo } },
      select: { overallScore: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),

    // Exam date + daily goal
    db.user.findUnique({ where: { id: userId }, select: { examDate: true, dailyGoal: true } }),

    // Today's attempt count
    db.attempt.count({ where: { userId, createdAt: { gte: todayStart } } }),

    // Total practice time — aggregate at DB level
    db.attempt.aggregate({
      where: { userId, timeTaken: { not: null } },
      _sum: { timeTaken: true },
    }),

    // Distinct practice days for streak — DB does the distinct, not JS
    db.$queryRaw<Array<{ practice_date: Date }>>`
      SELECT DISTINCT DATE("createdAt" AT TIME ZONE 'UTC') AS practice_date
      FROM "Attempt"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${sixtyDaysAgo}
      ORDER BY practice_date DESC
    `,

    // Section + type averages — aggregated at DB level, no 500-row payload
    db.$queryRaw<Array<{ section: string; type: string; avg_score: number; cnt: bigint }>>`
      SELECT q.section, q.type,
             AVG(a."overallScore") AS avg_score,
             COUNT(*)             AS cnt
      FROM "Attempt" a
      JOIN "Question" q ON a."questionId" = q.id
      WHERE a."userId" = ${userId}
        AND a."overallScore" IS NOT NULL
      GROUP BY q.section, q.type
    `,

    // Prediction question counts by type — surfaces high-frequency expected questions
    db.question.groupBy({
      by: ["section", "type"],
      where: {
        isPrediction: true,
        isActive: true,
        OR: [
          { centreId: null },
          { isPublic: true },
          ...(user!.centreId ? [{ centreId: user!.centreId }] : []),
        ],
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 6,
    }),

    // Get user's batches to fetch assigned tests
    db.batchMember.findMany({ where: { userId }, select: { batchId: true } }),
  ]);

  // ── Streak ────────────────────────────────────────────────────────────────
  const daySet = new Set(
    practiceDays.map(r => r.practice_date.toISOString().split("T")[0])
  );
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const day = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    if (daySet.has(day)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  // ── Section / type averages ───────────────────────────────────────────────
  const avg = (arr: number[]) =>
    arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const sectionScores: Record<string, number[]> = {
    SPEAKING: [], WRITING: [], READING: [], LISTENING: [],
  };

  const typeAverages = sectionTypeAggs.map(r => {
    const score = Number(r.avg_score);
    sectionScores[r.section]?.push(score);
    return {
      type: r.type,
      section: r.section,
      averageScore: Math.round(score),
      count: Number(r.cnt),
    };
  }).filter(t => t.count >= 2).sort((a, b) => a.averageScore - b.averageScore);

  const weakAreas = typeAverages.slice(0, 3);
  const strongAreas = typeAverages.slice(-3).reverse();

  const secAvg = {
    SPEAKING: avg(sectionScores.SPEAKING),
    WRITING: avg(sectionScores.WRITING),
    READING: avg(sectionScores.READING),
    LISTENING: avg(sectionScores.LISTENING),
  };

  // ── Overall / PTE estimate ────────────────────────────────────────────────
  const allScores = sectionTypeAggs.map(r => Number(r.avg_score));
  const overallAvg = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  const hasData = Object.values(secAvg).some(v => v > 0);
  const weightedPractice = hasData
    ? secAvg.SPEAKING * 0.3 + secAvg.WRITING * 0.3 + secAvg.READING * 0.2 + secAvg.LISTENING * 0.2
    : 0;
  const estimatedPTEScore = hasData ? Math.round(10 + (weightedPractice / 90) * 80) : null;

  // ── Score trend ───────────────────────────────────────────────────────────
  const dayMap = new Map<string, number[]>();
  for (const a of weeklyScores) {
    const day = a.createdAt.toISOString().split("T")[0];
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(a.overallScore!);
  }
  const scoreTrend = Array.from(dayMap.entries()).map(([date, scores]) => ({
    date,
    score: avg(scores),
  }));

  const batchIds = memberships.map(m => m.batchId);
  const assignedTests = batchIds.length > 0
    ? await db.mockTest.findMany({
        where: { assignedBatchId: { in: batchIds }, isTemplate: true },
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const res = NextResponse.json({
    success: true,
    data: {
      totalAttempts,
      totalPracticeTime: totalPracticeTime._sum.timeTaken || 0,
      streak,
      examDate: profile?.examDate ? profile.examDate.toISOString() : null,
      dailyGoal: profile?.dailyGoal ?? 20,
      todayCount,
      averageScore: overallAvg,
      estimatedPTEScore,
      scoresBySection: secAvg,
      recentAttempts: recentAttempts.map(a => ({
        id: a.id,
        questionType: a.question.type,
        section: a.question.section,
        title: a.question.title,
        score: a.overallScore,
        createdAt: a.createdAt.toISOString(),
      })),
      mockTestScores: mockTests.map(t => ({
        score: t.overallScore,
        date: t.completedAt?.toISOString(),
      })),
      scoreTrend,
      weakAreas,
      strongAreas,
      predictions: predictionsAgg.map(p => ({
        type: p.type,
        section: p.section,
        count: p._count.id,
      })),
      assignedTests: assignedTests.map(t => ({
        id: t.id,
        title: t.title,
        createdAt: t.createdAt.toISOString(),
      })),
    },
  });
  res.headers.set("Cache-Control", "private, max-age=300");
  res.headers.set("Vary", "Cookie");
  return res;
}
