import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/questions/my-flags — all flagged questions for the current user
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const flags = await db.questionFlag.findMany({
    where: { userId: user!.id },
    include: {
      question: {
        select: { id: true, title: true, type: true, section: true, difficulty: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ success: true, data: flags });
}
