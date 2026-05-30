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

    // Calculate section scores from attempts using cross-skill weighting
    const attempts = await db.attempt.findMany({
      where: { mockTestId: params.testId },
      include: {
        question: { select: { section: true, type: true } },
      },
    });

    const skillScores = calculateSkillScores(
      attempts.map((a) => ({
        overallScore: a.overallScore,
        questionType: a.question.type,
        questionSection: a.question.section,
      }))
    );

    updateData.speakingScore  = skillScores.speaking;
    updateData.writingScore   = skillScores.writing;
    updateData.readingScore   = skillScores.reading;
    updateData.listeningScore = skillScores.listening;

    const nonZero = Object.values(skillScores).filter((s) => s > 0);
    updateData.overallScore = nonZero.length > 0
      ? Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length)
      : 0;

    // Calculate total time
    const startTime = await db.mockTest.findUnique({
      where: { id: params.testId },
      select: { startedAt: true },
    });
    if (startTime) {
      updateData.totalTime = Math.floor(
        (new Date().getTime() - startTime.startedAt.getTime()) / 1000
      );
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
