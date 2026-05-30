import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

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
  const { questionId, responseText, responseAudio, scores, overallScore, timeTaken, feedback, mockTestId } = body;

  if (!questionId) {
    return NextResponse.json(
      { success: false, error: "questionId is required" },
      { status: 400 }
    );
  }

  let attempt;
  if (mockTestId) {
    // Upsert: update existing attempt for this question in this mock test
    const existing = await db.attempt.findFirst({
      where: { userId: user!.id, questionId, mockTestId },
    });
    if (existing) {
      attempt = await db.attempt.update({
        where: { id: existing.id },
        data: {
          responseText: responseText || null,
          responseAudio: responseAudio || null,
          scores: scores || null,
          overallScore: overallScore ?? existing.overallScore,
          timeTaken: timeTaken || null,
          feedback: feedback || null,
        },
        include: { question: { select: { id: true, title: true, type: true, section: true } } },
      });
    } else {
      attempt = await db.attempt.create({
        data: {
          userId: user!.id,
          questionId,
          responseText: responseText || null,
          responseAudio: responseAudio || null,
          scores: scores || null,
          overallScore: overallScore || null,
          timeTaken: timeTaken || null,
          feedback: feedback || null,
          mockTestId,
        },
        include: { question: { select: { id: true, title: true, type: true, section: true } } },
      });
    }
  } else {
    attempt = await db.attempt.create({
      data: {
        userId: user!.id,
        questionId,
        responseText: responseText || null,
        responseAudio: responseAudio || null,
        scores: scores || null,
        overallScore: overallScore || null,
        timeTaken: timeTaken || null,
        feedback: feedback || null,
        mockTestId: null,
      },
      include: { question: { select: { id: true, title: true, type: true, section: true } } },
    });
  }

  return NextResponse.json(
    { success: true, data: attempt },
    { status: 201 }
  );
}
