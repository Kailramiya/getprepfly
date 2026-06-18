import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

// GET /api/attempts/[attemptId] — fetch a single attempt with question details + history
export async function GET(
  _req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const attempt = await db.attempt.findUnique({
    where: { id: params.attemptId },
    include: {
      question: {
        select: {
          id: true,
          type: true,
          section: true,
          title: true,
          difficulty: true,
          content: true,
          modelAnswer: true,
          audioUrl: true,
          imageUrl: true,
          explanation: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== user!.id) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Attempts on same question (for score-trend chart), excluding this one
  const history = await db.attempt.findMany({
    where: {
      userId: user!.id,
      questionId: attempt.questionId,
      id: { not: params.attemptId },
      overallScore: { not: null },
    },
    select: { id: true, overallScore: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  return NextResponse.json({
    success: true,
    data: { attempt, history },
  });
}
