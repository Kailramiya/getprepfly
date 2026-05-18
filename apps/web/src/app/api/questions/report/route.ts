import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// POST /api/questions/report — student reports an error in a question
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { questionId, reason, details } = await req.json();
  if (!questionId || !reason) {
    return NextResponse.json({ success: false, error: "questionId and reason required" }, { status: 400 });
  }

  const valid = ["WRONG_ANSWER", "BAD_AUDIO", "UNCLEAR_QUESTION", "BROKEN_IMAGE", "OTHER"];
  if (!valid.includes(reason)) {
    return NextResponse.json({ success: false, error: "Invalid reason" }, { status: 400 });
  }

  // One report per user per question — upsert
  const report = await db.questionReport.upsert({
    where: { id: `${user!.id}_${questionId}` },
    create: { id: `${user!.id}_${questionId}`, userId: user!.id, questionId, reason, details: details || null },
    update: { reason, details: details || null, resolved: false },
  });

  return NextResponse.json({ success: true, data: report });
}

// GET /api/questions/report — admin views all reports
export async function GET(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  const url = new URL(req.url);
  const resolved = url.searchParams.get("resolved") === "true";

  const reports = await db.questionReport.findMany({
    where: { resolved },
    include: {
      question: { select: { id: true, title: true, type: true, section: true } },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ success: true, data: reports });
}

// PATCH /api/questions/report — admin marks report resolved
export async function PATCH(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  const { id } = await req.json();
  await db.questionReport.update({ where: { id }, data: { resolved: true } });
  return NextResponse.json({ success: true });
}
