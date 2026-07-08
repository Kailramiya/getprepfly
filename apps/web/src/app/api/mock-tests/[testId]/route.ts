import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { calculateSkillScores, PTE_MIN_SCORE } from "@/lib/pte-scoring";

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
          question: {
            select: {
              id: true, type: true, section: true, title: true,
              content: true, audioUrl: true, imageUrl: true, marks: true,
              // modelAnswer + explanation excluded — not needed during test session
            },
          },
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
          responseAudio: true,
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
        questions: { select: { question: { select: { id: true, section: true, type: true, marks: true } } } },
      },
    });
    const attempts = await db.attempt.findMany({
      where: { mockTestId: params.testId },
      select: { questionId: true, overallScore: true, rawPointsEarned: true, maxPointsPossible: true, scores: true },
      orderBy: { createdAt: "desc" }
    });

    // Best (latest) attempt per question.
    const attemptByQ = new Map<string, any>();
    for (const a of attempts) {
      if (!attemptByQ.has(a.questionId)) {
        attemptByQ.set(a.questionId, a);
      }
    }

    const scoringInput = (testData?.questions ?? []).map((q) => {
      const a = attemptByQ.get(q.question.id);
      return {
        overallScore: a ? (a.overallScore ?? 0) : 0,
        rawPointsEarned: a ? a.rawPointsEarned : 0,
        maxPointsPossible: a ? a.maxPointsPossible : (q.question.marks ?? 0),
        scores: a?.scores ?? null,
        questionType: q.question.type,
        questionSection: q.question.section,
      };
    });

    const rawSkill = calculateSkillScores(scoringInput);

    // Apply minimum score floor to every skill so section scores are
    // internally consistent with the overall (no "3 speaking but 22 overall").
    const floor = (s: number) => Math.max(s, PTE_MIN_SCORE);
    const skillScores = {
      speaking:  floor(rawSkill.speaking),
      writing:   floor(rawSkill.writing),
      reading:   floor(rawSkill.reading),
      listening: floor(rawSkill.listening),
    };

    updateData.speakingScore  = skillScores.speaking;
    updateData.writingScore   = skillScores.writing;
    updateData.readingScore   = skillScores.reading;
    updateData.listeningScore = skillScores.listening;

    // FULL mock → average all four floored skills.
    // SECTIONAL → use raw scores to detect which skills were covered, then
    // average the floored values of only those skills.
    const SKILL_KEYS_ORDERED = ["speaking", "writing", "reading", "listening"] as const;
    const relevantScores = testData?.mockType === "SECTIONAL"
      ? SKILL_KEYS_ORDERED.filter((k) => rawSkill[k] > 0).map((k) => skillScores[k])
      : Object.values(skillScores);
    updateData.overallScore = relevantScores.length > 0
      ? Math.round(relevantScores.reduce((a, b) => a + b, 0) / relevantScores.length)
      : PTE_MIN_SCORE;

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
