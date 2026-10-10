import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/vocabulary/progress — the caller's mastered word IDs.
// VocabProgress already existed in the schema but nothing read or wrote it —
// the Vocabulary Builder's "Mastered" state was purely client-side and reset
// on every reload.
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const rows = await db.vocabProgress.findMany({
    where: { userId: user!.id, mastered: true },
    select: { vocabId: true },
  });
  return NextResponse.json({ success: true, data: { masteredIds: rows.map((r) => r.vocabId) } });
}

// POST /api/vocabulary/progress — mark a word reviewed / (un)mastered.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json().catch(() => null);
  const vocabId = body?.vocabId;
  if (!vocabId || typeof vocabId !== "string") {
    return NextResponse.json({ success: false, error: "vocabId is required" }, { status: 400 });
  }
  const mastered = !!body?.mastered;

  const progress = await db.vocabProgress.upsert({
    where: { userId_vocabId: { userId: user!.id, vocabId } },
    create: { userId: user!.id, vocabId, mastered, reviewCount: 1, lastReviewed: new Date() },
    update: { mastered, reviewCount: { increment: 1 }, lastReviewed: new Date() },
  });
  return NextResponse.json({ success: true, data: progress });
}
