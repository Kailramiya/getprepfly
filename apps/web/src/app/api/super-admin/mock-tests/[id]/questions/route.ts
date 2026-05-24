import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// POST /api/super-admin/mock-tests/[id]/questions — add questions to template
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { questionIds } = await req.json();
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    return NextResponse.json({ success: false, error: "No questions provided" }, { status: 400 });
  }

  // Get current max order
  const last = await db.mockTestQuestion.findFirst({
    where: { mockTestId: params.id },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  let nextOrder = (last?.order ?? -1) + 1;

  // Skip already-added questions
  const existing = await db.mockTestQuestion.findMany({
    where: { mockTestId: params.id, questionId: { in: questionIds } },
    select: { questionId: true },
  });
  const alreadyIn = new Set(existing.map((q) => q.questionId));
  const toAdd = questionIds.filter((id: string) => !alreadyIn.has(id));

  if (toAdd.length > 0) {
    await db.mockTestQuestion.createMany({
      data: toAdd.map((questionId: string) => ({
        mockTestId: params.id,
        questionId,
        order: nextOrder++,
      })),
    });
  }

  return NextResponse.json({ success: true, added: toAdd.length, skipped: questionIds.length - toAdd.length });
}

// DELETE /api/super-admin/mock-tests/[id]/questions — remove a question from template
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { questionId } = await req.json();
  if (!questionId) return NextResponse.json({ success: false, error: "questionId required" }, { status: 400 });

  await db.mockTestQuestion.deleteMany({
    where: { mockTestId: params.id, questionId },
  });

  return NextResponse.json({ success: true });
}

// PATCH /api/super-admin/mock-tests/[id]/questions — reorder questions
// Body: { questions: [{ id: mockTestQuestionId, order: number }] }
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { questions } = await req.json();
  if (!Array.isArray(questions)) return NextResponse.json({ success: false, error: "questions array required" }, { status: 400 });

  await Promise.all(
    questions.map((q: { id: string; order: number }) =>
      db.mockTestQuestion.update({ where: { id: q.id }, data: { order: q.order } })
    )
  );

  return NextResponse.json({ success: true });
}
