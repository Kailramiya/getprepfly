import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { getUserAccess } from "@/lib/access";

const MOCK_TEST_STRUCTURE: Record<string, Record<string, number>> = {
  SPEAKING: { READ_ALOUD: 6, REPEAT_SENTENCE: 10, DESCRIBE_IMAGE: 3, RETELL_LECTURE: 2, ANSWER_SHORT_QUESTION: 5, RESPOND_TO_SITUATION: 2 },
  WRITING: { SUMMARIZE_WRITTEN_TEXT: 2, WRITE_ESSAY: 1 },
  READING: { READING_MCQ_SINGLE: 2, READING_MCQ_MULTIPLE: 2, REORDER_PARAGRAPHS: 2, READING_FILL_BLANKS_DRAG: 2, READING_FILL_BLANKS_DROPDOWN: 3 },
  LISTENING: { SUMMARIZE_SPOKEN_TEXT: 1, LISTENING_MCQ_SINGLE: 2, LISTENING_MCQ_MULTIPLE: 2, LISTENING_FILL_BLANKS: 2, HIGHLIGHT_CORRECT_SUMMARY: 2, SELECT_MISSING_WORD: 2, WRITE_FROM_DICTATION: 3 },
};

// GET /api/mock-tests — list user's mock tests
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const tests = await db.mockTest.findMany({
    where: {
      userId: user!.id,
      ...(status && { status: status as any }),
    },
    include: {
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ success: true, data: tests });
}

// POST /api/mock-tests — create a new mock test (random or from a template)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    const body = await req.json().catch(() => ({}));
    const { templateId } = body;

    // Fetch user access for all paths
    const access = await getUserAccess(user!.id);

    // --- Start from a super-admin template: copy its questions ---
    if (templateId) {
      const template = await db.mockTest.findUnique({
        where: { id: templateId, isTemplate: true },
        include: { questions: { orderBy: { order: "asc" } } },
      });
      if (!template) return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });

      // Access check — free templates are open to everyone
      if (!(template as any).isFree) {
        if (template.mockType === "FULL" && !access.hasAllAccess) {
          return NextResponse.json(
            { success: false, error: "Full mock tests require all 4 sections. Please purchase the All Modules plan.", locked: true },
            { status: 403 }
          );
        }
        if (template.mockType === "SECTIONAL" && template.section) {
          const hasSection = access.hasAllAccess || access.modules.has(template.section as any);
          if (!hasSection) {
            return NextResponse.json(
              { success: false, error: `This ${template.section.toLowerCase()} mock test requires the ${template.section.charAt(0) + template.section.slice(1).toLowerCase()} module. Please purchase it to continue.`, locked: true },
              { status: 403 }
            );
          }
        }
      }

      const mockTest = await db.mockTest.create({
        data: {
          userId: user!.id,
          title: template.title,
          mockType: template.mockType,
          section: template.section,
          status: "IN_PROGRESS",
          currentSection: (template.section ?? "SPEAKING") as any,
          currentIndex: 0,
          questions: {
            create: template.questions.map(q => ({ questionId: q.questionId, order: q.order })),
          },
        },
        include: { _count: { select: { questions: true } } },
      });

      return NextResponse.json({ success: true, data: mockTest }, { status: 201 });
    }

    // --- Random full mock test — requires all 4 sections ---
    if (!access.hasAllAccess) {
      return NextResponse.json(
        { success: false, error: "Full mock tests require all 4 sections. Please purchase the All Modules plan.", locked: true },
        { status: 403 }
      );
    }

    // Single query for all sections/types — partition in JS instead of N round-trips
    const neededTypes = Object.entries(MOCK_TEST_STRUCTURE).flatMap(([, types]) =>
      Object.keys(types)
    );
    const allQuestions = await db.question.findMany({
      where: {
        type: { in: neededTypes as any[] },
        isActive: true,
        OR: [
          { centreId: null },
          ...(user!.centreId ? [{ centreId: user!.centreId }] : []),
        ],
      },
      select: { id: true, section: true, type: true },
    });

    // Group by type
    const byType = new Map<string, string[]>();
    for (const q of allQuestions) {
      if (!byType.has(q.type)) byType.set(q.type, []);
      byType.get(q.type)!.push(q.id);
    }

    // Shuffle + select per type in section order
    const questionSelections: { questionId: string; order: number }[] = [];
    let order = 0;
    for (const [, types] of Object.entries(MOCK_TEST_STRUCTURE)) {
      for (const [type, count] of Object.entries(types)) {
        const pool = byType.get(type) ?? [];
        if (pool.length === 0) continue; // Skip if absolutely no questions available for this type
        const shuffled = pool.sort(() => Math.random() - 0.5);
        for (let i = 0; i < count; i++) {
          questionSelections.push({ questionId: shuffled[i % shuffled.length], order: order++ });
        }
      }
    }

    if (questionSelections.length === 0) {
      return NextResponse.json(
        { success: false, error: "Not enough questions available to create a mock test" },
        { status: 400 }
      );
    }

    const mockTest = await db.mockTest.create({
      data: {
        userId: user!.id,
        title: `Mock Test ${new Date().toLocaleDateString("en-IN")}`,
        status: "IN_PROGRESS",
        currentSection: "SPEAKING",
        currentIndex: 0,
        questions: { create: questionSelections },
      },
      include: { _count: { select: { questions: true } } },
    });

    return NextResponse.json({ success: true, data: mockTest }, { status: 201 });
  } catch (err) {
    console.error("Mock test creation error:", err);
    return NextResponse.json({ success: false, error: "Failed to create mock test" }, { status: 500 });
  }
}
