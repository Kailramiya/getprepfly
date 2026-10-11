import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { canAccessQuestion } from "@/lib/access";
import { enforceRateLimit } from "@/lib/rate-limit";

// GET /api/questions/:id/reveal — "Show Answer" peek, before or after submitting.
// Unlike GET /api/questions/:id (which strips answer keys so students can't see
// them before attempting), this endpoint exists specifically to hand them back —
// the student explicitly asked to see the answer, so there's nothing to protect
// here. It never touches Attempt/score data; it's a pure read, same access gate
// as every other question endpoint.
export async function GET(
  _req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const limited = await enforceRateLimit("questions", user!.id);
  if (limited) return limited;

  const question = await db.question.findUnique({
    where: { id: params.questionId },
    select: { isActive: true, isPublic: true, centreId: true, section: true, content: true, modelAnswer: true, explanation: true },
  });

  if (!question || !question.isActive || !(await canAccessQuestion(user!, question))) {
    return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      content: question.content, // unstripped — includes correctAnswer/correctAnswers/correctOrder/blanks/incorrectIndices
      modelAnswer: question.modelAnswer,
      explanation: question.explanation,
    },
  });
}
