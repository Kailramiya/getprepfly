import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/centres/students/[userId]/progress
export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const centreId = user!.centreId;
  if (!centreId && user!.role !== "SUPER_ADMIN") {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const student = await db.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true, name: true, email: true, phone: true, createdAt: true,
      centreId: true,
      studentPlan: { select: { planType: true, status: true } },
    },
  });

  if (!student || (centreId && student.centreId !== centreId)) {
    return NextResponse.json({ success: false, error: "Student not found" }, { status: 404 });
  }

  const [attempts, mockTests, totalAttempts] = await Promise.all([
    db.attempt.findMany({
      where: { userId: params.userId },
      include: { question: { select: { type: true, section: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.mockTest.findMany({
      where: { userId: params.userId, status: "COMPLETED" },
      select: { overallScore: true, completedAt: true },
      orderBy: { completedAt: "desc" },
      take: 5,
    }),
    db.attempt.count({ where: { userId: params.userId } }),
  ]);

  // Section averages
  const sectionScores: Record<string, number[]> = { SPEAKING: [], WRITING: [], READING: [], LISTENING: [] };
  for (const a of attempts) {
    if (a.overallScore !== null) sectionScores[a.question.section]?.push(a.overallScore);
  }
  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return NextResponse.json({
    success: true,
    data: {
      student,
      totalAttempts,
      averageScore: avg(attempts.filter(a => a.overallScore !== null).map(a => a.overallScore!)),
      scoresBySection: {
        SPEAKING: avg(sectionScores.SPEAKING),
        WRITING: avg(sectionScores.WRITING),
        READING: avg(sectionScores.READING),
        LISTENING: avg(sectionScores.LISTENING),
      },
      recentAttempts: attempts.map(a => ({
        id: a.id,
        questionType: a.question.type,
        section: a.question.section,
        title: a.question.title,
        score: a.overallScore,
        createdAt: a.createdAt.toISOString(),
      })),
      mockTests: mockTests.map(m => ({
        score: m.overallScore,
        date: m.completedAt?.toISOString(),
      })),
    },
  });
}
