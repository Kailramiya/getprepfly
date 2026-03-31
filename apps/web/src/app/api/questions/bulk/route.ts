import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// POST /api/questions/bulk — bulk create questions from JSON array
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { questions } = body;

  if (!Array.isArray(questions) || questions.length === 0) {
    return NextResponse.json(
      { success: false, error: "Questions array is required" },
      { status: 400 }
    );
  }

  if (questions.length > 200) {
    return NextResponse.json(
      { success: false, error: "Maximum 200 questions per batch" },
      { status: 400 }
    );
  }

  const centreId = user!.role === "SUPER_ADMIN" ? null : user!.centreId || null;

  try {
    const created = await db.question.createMany({
      data: questions.map((q: any) => ({
        section: q.section,
        type: q.type,
        difficulty: q.difficulty || "MEDIUM",
        title: q.title?.trim() || `${q.type} Question`,
        content: q.content,
        explanation: q.explanation || null,
        modelAnswer: q.modelAnswer || null,
        audioUrl: q.audioUrl || null,
        imageUrl: q.imageUrl || null,
        tags: q.tags || [],
        isPrediction: q.isPrediction || false,
        centreId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json(
      { success: true, data: { count: created.count }, message: `${created.count} questions uploaded` },
      { status: 201 }
    );
  } catch (err) {
    console.error("Bulk upload error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to upload. Check your data format." },
      { status: 400 }
    );
  }
}
