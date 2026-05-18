import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { testId: string } }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const test = await db.mockTest.findFirst({
    where: { id: params.testId, userId: user!.id },
    include: {
      attempts: { select: { overallScore: true, timeTaken: true, scores: true } },
      questions: { select: { question: { select: { section: true } } } },
    },
  });

  if (!test) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const attempts = test.attempts;
  const scored = attempts.filter(a => a.overallScore !== null);
  const correctAnswers = scored.filter(a => a.overallScore !== null && a.overallScore >= 45).length;
  const totalTime = attempts.reduce((s, a) => s + (a.timeTaken || 0), 0);

  return NextResponse.json({
    success: true,
    data: {
      id: test.id,
      title: test.title || "Mock Test",
      completedAt: test.completedAt?.toISOString() || null,
      overallScore: test.overallScore,
      speakingScore: test.speakingScore,
      writingScore: test.writingScore,
      readingScore: test.readingScore,
      listeningScore: test.listeningScore,
      totalQuestions: test.questions.length,
      correctAnswers,
      timeTaken: totalTime || null,
    },
  });
}
