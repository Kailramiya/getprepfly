import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { getUserAccess, PTESection } from "@/lib/access";

// GET /api/questions/:id — get full question with content
export async function GET(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

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
  let canView = false;

  if (isSuperAdmin) {
    canView = true;
  } else if (isCentreStaff) {
    canView = question.centreId === null || question.centreId === user!.centreId;
  } else {
    const access = await getUserAccess(user!.id);
    const accessibleSections: PTESection[] = access.hasAllAccess
      ? ["SPEAKING", "WRITING", "READING", "LISTENING"]
      : Array.from(access.modules);

    if (access.canPracticeSpeaking && !accessibleSections.includes("SPEAKING")) {
      accessibleSections.push("SPEAKING");
    }

    canView =
      question.isPublic ||
      (!!user!.centreId && question.centreId === user!.centreId) ||
      accessibleSections.includes(question.section as PTESection);
  }

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
  return NextResponse.json({
    success: true,
    data: {
      ...safeQuestion,
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
    audioUrl, imageUrl, tags, isPrediction, isActive, marks,
    section, type, isPublic,
  } = body;

  // Centre admin can only edit their own questions
  if (user!.role !== "SUPER_ADMIN") {
    const question = await db.question.findUnique({
      where: { id: params.questionId },
      select: { centreId: true },
    });
    if (question?.centreId && question.centreId !== user!.centreId) {
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
      ...(isPrediction !== undefined && { isPrediction }),
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
  const { error: deleteError } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (deleteError) return deleteError;

  await db.question.update({
    where: { id: params.questionId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, message: "Question deleted" });
}
