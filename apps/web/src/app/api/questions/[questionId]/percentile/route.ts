import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

// GET /api/questions/:id/percentile?score=N
// Returns how many % of users scored below the given score on this question.
// Only returned when there are ≥5 prior attempts (to avoid misleading "100th percentile" on first attempt).
export async function GET(
  req: NextRequest,
  { params }: { params: { questionId: string } }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const score = parseInt(new URL(req.url).searchParams.get("score") || "");
  if (isNaN(score)) {
    return NextResponse.json({ success: false, error: "score param required" }, { status: 400 });
  }

  const allScores = await db.attempt.findMany({
    where: { questionId: params.questionId, overallScore: { not: null } },
    select: { overallScore: true },
  });

  const scores = allScores.map((a) => a.overallScore as number);
  if (scores.length < 5) {
    return NextResponse.json({ success: true, data: { percentile: null } });
  }

  const below = scores.filter((s) => s < score).length;
  const percentile = Math.round((below / scores.length) * 100);
  return NextResponse.json({ success: true, data: { percentile } });
}
