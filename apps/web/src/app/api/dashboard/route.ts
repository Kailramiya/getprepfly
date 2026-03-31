import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

// GET /api/dashboard — student dashboard stats
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const userId = user!.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Parallel queries for performance
  const [
    totalAttempts,
    recentAttempts,
    mockTests,
    weeklyScores,
  ] = await Promise.all([
    // Total attempts count
    db.attempt.count({ where: { userId } }),

    // Recent attempts (last 10)
    db.attempt.findMany({
      where: { userId },
      include: {
        question: { select: { type: true, section: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    // Mock test count + scores
    db.mockTest.findMany({
      where: { userId, status: "COMPLETED" },
      select: { overallScore: true, completedAt: true },
      orderBy: { completedAt: "desc" },
      take: 10,
    }),

    // Weekly score trend (last 30 days)
    db.attempt.findMany({
      where: {
        userId,
        overallScore: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { overallScore: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Calculate section averages from attempts with question info
  const attemptsWithSection = await db.attempt.findMany({
    where: { userId, overallScore: { not: null } },
    include: { question: { select: { section: true, type: true } } },
  });

  const sectionScores: Record<string, number[]> = {
    SPEAKING: [], WRITING: [], READING: [], LISTENING: [],
  };
  const typeScores: Record<string, number[]> = {};

  for (const attempt of attemptsWithSection) {
    if (attempt.overallScore !== null) {
      sectionScores[attempt.question.section]?.push(attempt.overallScore);
      if (!typeScores[attempt.question.type]) typeScores[attempt.question.type] = [];
      typeScores[attempt.question.type].push(attempt.overallScore);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  // Weak/strong areas
  const typeAverages = Object.entries(typeScores)
    .map(([type, scores]) => ({ type, averageScore: avg(scores), count: scores.length }))
    .filter((t) => t.count >= 2)
    .sort((a, b) => a.averageScore - b.averageScore);

  const weakAreas = typeAverages.slice(0, 3);
  const strongAreas = typeAverages.slice(-3).reverse();

  // Total practice time (sum of timeTaken from attempts)
  const timeResult = await db.attempt.aggregate({
    where: { userId, timeTaken: { not: null } },
    _sum: { timeTaken: true },
  });

  // Score trend grouped by day
  const scoreTrend: { date: string; score: number }[] = [];
  const dayMap = new Map<string, number[]>();
  for (const attempt of weeklyScores) {
    const day = attempt.createdAt.toISOString().split("T")[0];
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(attempt.overallScore!);
  }
  dayMap.forEach((scores, date) => {
    scoreTrend.push({ date, score: avg(scores) });
  });

  // Practice streak (consecutive days)
  const attemptsForStreak = await db.attempt.findMany({
    where: { userId, createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } },
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  let streak = 0;
  const practiceDays = new Set(attemptsForStreak.map((a) => a.createdAt.toISOString().split("T")[0]));
  for (let i = 0; i < 60; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    if (practiceDays.has(date)) {
      streak++;
    } else if (i > 0) {
      break; // streak broken
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      totalAttempts,
      totalPracticeTime: timeResult._sum.timeTaken || 0,
      streak,
      averageScore: avg(attemptsWithSection.filter((a) => a.overallScore !== null).map((a) => a.overallScore!)),
      scoresBySection: {
        SPEAKING: avg(sectionScores.SPEAKING),
        WRITING: avg(sectionScores.WRITING),
        READING: avg(sectionScores.READING),
        LISTENING: avg(sectionScores.LISTENING),
      },
      recentAttempts: recentAttempts.map((a) => ({
        id: a.id,
        questionType: a.question.type,
        section: a.question.section,
        title: a.question.title,
        score: a.overallScore,
        createdAt: a.createdAt.toISOString(),
      })),
      mockTestScores: mockTests.map((t) => ({
        score: t.overallScore,
        date: t.completedAt?.toISOString(),
      })),
      scoreTrend,
      weakAreas,
      strongAreas,
    },
  });
}
