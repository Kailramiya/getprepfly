import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// POST /api/questions/flag — set or clear a flag on a question
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { questionId, flag } = await req.json();
  if (!questionId) return NextResponse.json({ success: false, error: "questionId required" }, { status: 400 });

  const validFlags = ["WEAK", "STRONG", "REVIEW_AGAIN"];

  // If flag is null/undefined or invalid, remove the flag (toggle off)
  if (!flag || !validFlags.includes(flag)) {
    await db.questionFlag.deleteMany({ where: { userId: user!.id, questionId } });
    return NextResponse.json({ success: true, data: null });
  }

  const result = await db.questionFlag.upsert({
    where: { userId_questionId: { userId: user!.id, questionId } },
    create: { userId: user!.id, questionId, flag },
    update: { flag },
  });

  return NextResponse.json({ success: true, data: result });
}

// GET /api/questions/flag?questionIds=id1,id2,... — get flags for given questions
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const ids = url.searchParams.get("questionIds")?.split(",").filter(Boolean) || [];

  if (ids.length === 0) return NextResponse.json({ success: true, data: {} });

  const flags = await db.questionFlag.findMany({
    where: { userId: user!.id, questionId: { in: ids } },
    select: { questionId: true, flag: true },
  });

  const map = Object.fromEntries(flags.map(f => [f.questionId, f.flag]));
  return NextResponse.json({ success: true, data: map });
}
