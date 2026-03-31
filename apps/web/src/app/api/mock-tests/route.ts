import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

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

// POST /api/mock-tests — create a new mock test
export async function POST(_req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  try {
    // Select random questions for each type
    const questionSelections: { questionId: string; order: number }[] = [];
    let order = 0;

    for (const [section, types] of Object.entries(MOCK_TEST_STRUCTURE)) {
      for (const [type, count] of Object.entries(types)) {
        const questions = await db.question.findMany({
          where: {
            section: section as any,
            type: type as any,
            isActive: true,
            OR: [
              { centreId: null },
              ...(user!.centreId ? [{ centreId: user!.centreId }] : []),
            ],
          },
          select: { id: true },
          take: count * 3, // get more than needed for randomization
        });

        // Shuffle and take required count
        const shuffled = questions.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(count, shuffled.length));

        for (const q of selected) {
          questionSelections.push({ questionId: q.id, order: order++ });
        }
      }
    }

    if (questionSelections.length === 0) {
      return NextResponse.json(
        { success: false, error: "Not enough questions available to create a mock test" },
        { status: 400 }
      );
    }

    // Create mock test with questions
    const mockTest = await db.mockTest.create({
      data: {
        userId: user!.id,
        title: `Mock Test ${new Date().toLocaleDateString("en-IN")}`,
        status: "IN_PROGRESS",
        currentSection: "SPEAKING",
        currentIndex: 0,
        questions: {
          create: questionSelections,
        },
      },
      include: {
        _count: { select: { questions: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: mockTest },
      { status: 201 }
    );
  } catch (err) {
    console.error("Mock test creation error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create mock test" },
      { status: 500 }
    );
  }
}
