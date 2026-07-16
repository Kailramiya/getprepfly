import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: { testId: string } }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const test = await db.mockTest.findFirst({
    where: { id: params.testId, userId: user!.id },
    include: {
      attempts: { 
        select: { 
          id: true,
          questionId: true,
          overallScore: true, 
          timeTaken: true, 
          scores: true,
          responseText: true,
          responseAudio: true,
          question: {
            select: {
              id: true,
              title: true,
              type: true,
              section: true,
              content: true,
              modelAnswer: true,
              marks: true,
            }
          }
        } 
      },
      questions: { select: { question: { select: { section: true } } } },
    },
  });

  if (!test) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  const attempts = test.attempts;
  // Count distinct questions the student actually attempted, and how many are
  // AI-scored vs still pending. "Correct" isn't well-defined for AI-scored
  // tasks, so we report Answered (honest) instead of a fake correct count.
  const attemptMap = new Map();
  for (const a of attempts) {
    if (!a.questionId) continue;
    const existing = attemptMap.get(a.questionId);
    if (!existing || (a.overallScore !== null && existing.overallScore === null)) {
      attemptMap.set(a.questionId, a);
    }
  }
  const uniqueAttempts = Array.from(attemptMap.values());
  const attempted = uniqueAttempts.length;
  const scored = uniqueAttempts.filter(a => a.overallScore !== null).length;
  const pending = Math.max(0, attempted - scored);
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
      attempted,
      pending,
      timeTaken: totalTime || null,
      attempts: attempts, // Now includes detailed attempt and question data
    },
  });
}
