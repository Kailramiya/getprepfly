import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { canAccessQuestion } from "@/lib/access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { stripAnswerKeys } from "@/lib/answer-keys";

// GET /api/questions/:id — get full question with content
export async function GET(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Anti-scraping: bound per-question fetches per user.
  const limited = await enforceRateLimit("questions", user!.id);
  if (limited) return limited;

  const question = await db.question.findUnique({
    where: { id: params.questionId },
  });

  if (!question || !question.isActive) {
    return NextResponse.json(
      { success: false, error: "Question not found" },
      { status: 404 }
    );
  }

  const isSuperAdmin = user!.role === "SUPER_ADMIN";
  const isCentreStaff = user!.role === "CENTRE_ADMIN" || user!.role === "TEACHER";
  const canView = await canAccessQuestion(user!, question);

  if (!canView) {
    return NextResponse.json(
      { success: false, error: "Question not found" },
      { status: 404 }
    );
  }

  if (isSuperAdmin || isCentreStaff) {
    return NextResponse.json({ success: true, data: question });
  }

  const { centreId, ...safeQuestion } = question;

  // Strip answer keys from content so students cannot see them before submitting.
  // Scoring is done server-side via POST /api/questions/:id/score. Must use the
  // shared stripAnswerKeys (not a one-off top-level delete loop): for fill-blanks
  // types the real answer lives nested inside content.blanks[].correctAnswer,
  // which a shallow top-level strip never touches — this endpoint was shipping
  // every fill-blanks question's answer key in the response before the student
  // ever attempted it. stripAnswerKeys already handles this correctly and is
  // what /api/mock-tests/:testId uses for the same purpose.
  const safeContent = safeQuestion.content ? stripAnswerKeys(safeQuestion.type, safeQuestion.content) : null;

  return NextResponse.json({
    success: true,
    data: {
      ...safeQuestion,
      content: safeContent,
      modelAnswer: null, // hide until after submission
      source: user!.centreId && centreId === user!.centreId ? "MY_CENTRE" : "PUBLIC",
    },
  });
}

// PATCH /api/questions/:id — update question
export async function PATCH(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const body = await req.json();
  const {
    title, content, difficulty, explanation, modelAnswer,
    audioUrl, imageUrl, tags, isActive, marks,
    section, type, isPublic,
  } = body;

  // Centre admin/teacher can only edit their own centre's questions — not
  // another centre's, and not the global question bank (centreId: null).
  // A truthy-only check here let `question.centreId === null` (global) slip
  // through unguarded, since `null && ...` is falsy regardless of the rest
  // of the condition.
  if (user!.role !== "SUPER_ADMIN") {
    const question = await db.question.findUnique({
      where: { id: params.questionId },
      select: { centreId: true },
    });
    if (question?.centreId !== user!.centreId) {
      return NextResponse.json(
        { success: false, error: "You can only edit your own questions" },
        { status: 403 }
      );
    }
  }

  const updated = await db.question.update({
    where: { id: params.questionId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content }),
      ...(difficulty !== undefined && { difficulty }),
      ...(explanation !== undefined && { explanation }),
      ...(modelAnswer !== undefined && { modelAnswer }),
      ...(audioUrl !== undefined && { audioUrl }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(tags !== undefined && { tags }),
      ...(isActive !== undefined && { isActive }),
      ...(section !== undefined && { section }),
      ...(type !== undefined && { type }),
      ...(typeof marks === "number" && marks > 0 && { marks }),
      // Only super admin can toggle isPublic
      ...(isPublic !== undefined && user!.role === "SUPER_ADMIN" && { isPublic: !!isPublic }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/questions/:id — soft delete
export async function DELETE(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { user, error: deleteError } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (deleteError) return deleteError;

  // Same ownership rule as PATCH: a centre admin can only delete their own
  // centre's questions, never another centre's or the global question bank.
  if (user!.role !== "SUPER_ADMIN") {
    const question = await db.question.findUnique({
      where: { id: params.questionId },
      select: { centreId: true },
    });
    if (question?.centreId !== user!.centreId) {
      return NextResponse.json(
        { success: false, error: "You can only delete your own questions" },
        { status: 403 }
      );
    }
  }

  await db.question.update({
    where: { id: params.questionId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, message: "Question deleted" });
}
