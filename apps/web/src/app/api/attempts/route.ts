import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth-utils";
import { canAccessQuestion } from "@/lib/access";

const SCORE_ADOPT_WINDOW_MS = 30 * 60 * 1000;

// GET /api/attempts — get user's attempt history
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const section = url.searchParams.get("section");
  const type = url.searchParams.get("type");
  const questionId = url.searchParams.get("questionId");
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");

  const where: any = {
    userId: user!.id,
    ...(questionId && { questionId }),
    ...(section && !questionId && { question: { section } }),
    ...(type && !questionId && { question: { type } }),
  };

  const [attempts, total] = await Promise.all([
    db.attempt.findMany({
      where,
      include: {
        question: {
          select: { id: true, title: true, type: true, section: true, difficulty: true },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.attempt.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items: attempts, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/attempts — submit an attempt
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  // Score fields in the body (scores/overallScore/rawPoints*/feedback) are deliberately ignored:
  // the client is untrusted, so we adopt the scores the server-side scorers already recorded.
  const { questionId, responseText, responseAudio, timeTaken, mockTestId } = body;

  if (!questionId || typeof questionId !== "string") {
    return NextResponse.json(
      { success: false, error: "questionId is required" },
      { status: 400 }
    );
  }

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { isActive: true, isPublic: true, centreId: true, section: true },
  });
  if (!question || !question.isActive || !(await canAccessQuestion(user!, question))) {
    return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
  }

  if (mockTestId) {
    const ownsTest = await db.mockTest.findFirst({
      where: { id: String(mockTestId), userId: user!.id },
      select: { id: true },
    });
    if (!ownsTest) {
      return NextResponse.json({ success: false, error: "Mock test not found" }, { status: 404 });
    }
  }

  // Latest server-scored attempt by this user for this question (window covers a single sitting).
  const scored = await db.attempt.findFirst({
    where: {
      userId: user!.id,
      questionId,
      overallScore: { not: null },
      createdAt: { gte: new Date(Date.now() - SCORE_ADOPT_WINDOW_MS) },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = {
    responseText: responseText || null,
    responseAudio: responseAudio || null,
    scores: scored?.scores ?? Prisma.JsonNull,
    rawPointsEarned: scored?.rawPointsEarned ?? null,
    maxPointsPossible: scored?.maxPointsPossible ?? null,
    overallScore: scored?.overallScore ?? null,
    feedback: scored?.feedback ?? null,
    timeTaken: timeTaken || null,
  };
  const include = { question: { select: { id: true, title: true, type: true, section: true } } };

  let attempt;
  if (mockTestId) {
    // Upsert: update existing attempt for this question in this mock test
    const existing = await db.attempt.findFirst({
      where: { userId: user!.id, questionId, mockTestId },
    });
    attempt = existing
      ? await db.attempt.update({ where: { id: existing.id }, data, include })
      : await db.attempt.create({ data: { ...data, userId: user!.id, questionId, mockTestId }, include });
  } else {
    attempt = await db.attempt.create({
      data: { ...data, userId: user!.id, questionId, mockTestId: null },
      include,
    });
  }

  return NextResponse.json(
    { success: true, data: attempt },
    { status: 201 }
  );
}
