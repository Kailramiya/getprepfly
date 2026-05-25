import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

const FULL_STRUCTURE: Record<string, Record<string, number>> = {
  SPEAKING: { READ_ALOUD: 6, REPEAT_SENTENCE: 10, DESCRIBE_IMAGE: 3, RETELL_LECTURE: 2, ANSWER_SHORT_QUESTION: 5, RESPOND_TO_SITUATION: 2 },
  WRITING: { SUMMARIZE_WRITTEN_TEXT: 2, WRITE_ESSAY: 1 },
  READING: { READING_MCQ_SINGLE: 2, READING_MCQ_MULTIPLE: 2, REORDER_PARAGRAPHS: 2, READING_FILL_BLANKS_DRAG: 2, READING_FILL_BLANKS_DROPDOWN: 3 },
  LISTENING: { SUMMARIZE_SPOKEN_TEXT: 1, LISTENING_MCQ_SINGLE: 2, LISTENING_MCQ_MULTIPLE: 2, LISTENING_FILL_BLANKS: 2, HIGHLIGHT_CORRECT_SUMMARY: 2, SELECT_MISSING_WORD: 2, WRITE_FROM_DICTATION: 3 },
};

const SECTIONAL_STRUCTURE: Record<string, Record<string, number>> = {
  SPEAKING: FULL_STRUCTURE.SPEAKING,
  WRITING: FULL_STRUCTURE.WRITING,
  READING: FULL_STRUCTURE.READING,
  LISTENING: FULL_STRUCTURE.LISTENING,
};

// GET /api/super-admin/mock-tests — list all global templates
export async function GET() {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const templates = await db.mockTest.findMany({
    where: { isTemplate: true, assignedBatchId: null },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: templates });
}

// POST /api/super-admin/mock-tests — create a global mock test template
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { title, mockType, section } = body;

  if (!title?.trim()) return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
  if (!["FULL", "SECTIONAL"].includes(mockType)) return NextResponse.json({ success: false, error: "Invalid mock type" }, { status: 400 });
  if (mockType === "SECTIONAL" && !["SPEAKING", "WRITING", "READING", "LISTENING"].includes(section)) {
    return NextResponse.json({ success: false, error: "Invalid section for sectional test" }, { status: 400 });
  }

  try {
    // Determine which sections/types to include
    const structure = mockType === "FULL"
      ? FULL_STRUCTURE
      : { [section]: SECTIONAL_STRUCTURE[section] };

    const questionSelections: { questionId: string; order: number }[] = [];
    let order = 0;

    for (const [sec, types] of Object.entries(structure)) {
      for (const [type, count] of Object.entries(types)) {
        const questions = await db.question.findMany({
          where: { section: sec as any, type: type as any, isActive: true },
          select: { id: true },
          take: count * 3,
        });
        const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, Math.min(count, questions.length));
        for (const q of shuffled) {
          questionSelections.push({ questionId: q.id, order: order++ });
        }
      }
    }

    if (questionSelections.length === 0) {
      return NextResponse.json({ success: false, error: "Not enough questions available. Add questions first." }, { status: 400 });
    }

    const template = await db.mockTest.create({
      data: {
        userId: user!.id,
        title: title.trim(),
        mockType,
        section: mockType === "SECTIONAL" ? section : null,
        isTemplate: true,
        status: "IN_PROGRESS",
        currentSection: (mockType === "SECTIONAL" ? section : "SPEAKING") as any,
        questions: { create: questionSelections },
      },
      include: { _count: { select: { questions: true } } },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (err) {
    console.error("Template creation error:", err);
    return NextResponse.json({ success: false, error: "Failed to create template. Please ensure the database schema is up to date." }, { status: 500 });
  }
}

// DELETE /api/super-admin/mock-tests?id=xxx
export async function DELETE(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });

  await db.mockTest.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
