import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-utils";

// GET /api/templates — list templates (visible to all authenticated users)
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const questionType = url.searchParams.get("questionType");
  const language = url.searchParams.get("language");

  const where: any = {};
  if (questionType) where.questionType = questionType;
  if (language) where.language = language;

  const templates = await db.template.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: templates });
}

// POST /api/templates — create template (admin / teacher only)
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const body = await req.json();
  const { title, questionType, content, language, isPremium } = body;

  if (!title?.trim() || !questionType || !content?.trim()) {
    return NextResponse.json(
      { success: false, error: "Title, question type, and content are required" },
      { status: 400 }
    );
  }

  const template = await db.template.create({
    data: {
      title: title.trim(),
      questionType,
      content: content.trim(),
      language: language || "EN",
      isPremium: !!isPremium,
    },
  });

  return NextResponse.json(
    { success: true, data: template, message: "Template created successfully" },
    { status: 201 }
  );
}
