import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

// PATCH /api/attempts/[attemptId] — attach the persistent recording URL to an
// already-scored speaking attempt. Uploading the audio (POST
// /api/attempts/upload-audio) only writes to storage and hands back a URL;
// this is the write that actually saves it onto the attempt so it survives a
// reload. Used by regular practice (mock-test mode saves responseAudio itself
// via its own POST /api/attempts upsert, so this is skipped there).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const responseAudio = body?.responseAudio;
  if (!responseAudio || typeof responseAudio !== "string") {
    return NextResponse.json({ success: false, error: "responseAudio is required" }, { status: 400 });
  }

  const existing = await db.attempt.findUnique({ where: { id: params.attemptId }, select: { userId: true } });
  if (!existing || existing.userId !== user!.id) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const attempt = await db.attempt.update({
    where: { id: params.attemptId },
    data: { responseAudio },
  });

  return NextResponse.json({ success: true, data: attempt });
}

// GET /api/attempts/[attemptId] — fetch a single attempt with question details + history
export async function GET(
  _req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const attempt = await db.attempt.findUnique({
    where: { id: params.attemptId },
    include: {
      question: {
        select: {
          id: true,
          type: true,
          section: true,
          title: true,
          difficulty: true,
          content: true,
          modelAnswer: true,
          audioUrl: true,
          imageUrl: true,
          explanation: true,
        },
      },
    },
  });

  if (!attempt || attempt.userId !== user!.id) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Attempts on same question (for score-trend chart), excluding this one
  const history = await db.attempt.findMany({
    where: {
      userId: user!.id,
      questionId: attempt.questionId,
      id: { not: params.attemptId },
      overallScore: { not: null },
    },
    select: { id: true, overallScore: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  return NextResponse.json({
    success: true,
    data: { attempt, history },
  });
}
