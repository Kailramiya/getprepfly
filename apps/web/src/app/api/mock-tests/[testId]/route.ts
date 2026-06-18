import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { calculateSkillScores } from "@/lib/pte-scoring";

// GET /api/mock-tests/:testId — get mock test with questions
export async function GET(
  _req: NextRequest,
  { params }: { params: { testId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const test = await db.mockTest.findUnique({
    where: { id: params.testId },
    include: {
      questions: {
        include: {
          question: true,
        },
        orderBy: { order: "asc" },
      },
      attempts: {
        select: {
          id: true,
          questionId: true,
          overallScore: true,
          scores: true,
          timeTaken: true,
          responseText: true,
        },
      },
    },
  });

  if (!test || test.userId !== user!.id) {
    return NextResponse.json(
      { success: false, error: "Mock test not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: test });
}

// PATCH /api/mock-tests/:testId — update test progress or complete
export async function PATCH(
  req: NextRequest,
  { params }: { params: { testId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { currentSection, currentIndex, status } = body;

  const test = await db.mockTest.findUnique({
    where: { id: params.testId },
    select: { userId: true },
  });

  if (!test || test.userId !== user!.id) {
    return NextResponse.json(
      { success: false, error: "Mock test not found" },
      { status: 404 }
    );
  }

  const updateData: any = {};

  if (currentSection) updateData.currentSection = currentSection;
  if (currentIndex !== undefined) updateData.currentIndex = currentIndex;

  if (status === "COMPLETED") {
    updateData.status = "COMPLETED";
    updateData.completedAt = new Date();

    // Score the test fairly: every question in the test counts, and any
    // unanswered / unscored question counts as 0 (as in the real exam).
    // Scoring only over answered questions would inflate the result.
    const testData = await db.mockTest.findUnique({
      where: { id: params.testId },
      select: {
        startedAt: true,
        mockType: true,
        questions: { select: { question: { select: { id: true, section: true, type: true } } } },
      },
    });
    const attempts = await db.attempt.findMany({
      where: { mockTestId: params.testId },
      select: { questionId: true, overallScore: true },
    });

    // Best (non-null) score per question.
    const scoreByQ = new Map<string, number | null>();
    for (const a of attempts) {
      const prev = scoreByQ.get(a.questionId);
      if (prev == null) scoreByQ.set(a.questionId, a.overallScore);
    }

    const scoringInput = (testData?.questions ?? []).map((q) => ({
      overallScore: scoreByQ.get(q.question.id) ?? 0, // unanswered/unscored → 0
      questionType: q.question.type,
      questionSection: q.question.section,
    }));

    const skillScores = calculateSkillScores(scoringInput);
    updateData.speakingScore  = skillScores.speaking;
    updateData.writingScore   = skillScores.writing;
    updateData.readingScore   = skillScores.reading;
    updateData.listeningScore = skillScores.listening;

    // FULL mock → average all four skills (a fully-skipped skill is a real 0).
    // SECTIONAL → average only the skills that the test actually covered.
    const skillVals = Object.values(skillScores);
    const relevant = testData?.mockType === "SECTIONAL" ? skillVals.filter((s) => s > 0) : skillVals;
    updateData.overallScore = relevant.length > 0
      ? Math.round(relevant.reduce((a, b) => a + b, 0) / relevant.length)
      : 0;

    if (testData?.startedAt) {
      updateData.totalTime = Math.floor((Date.now() - testData.startedAt.getTime()) / 1000);
    }
  }

  if (status === "ABANDONED") {
    updateData.status = "ABANDONED";
  }

  const updated = await db.mockTest.update({
    where: { id: params.testId },
    data: updateData,
  });

  return NextResponse.json({ success: true, data: updated });
}
