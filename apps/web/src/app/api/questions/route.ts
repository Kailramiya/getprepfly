import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-utils";

// GET /api/questions — list questions with filters
export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const section = url.searchParams.get("section");
  const type = url.searchParams.get("type");
  const difficulty = url.searchParams.get("difficulty");
  const prediction = url.searchParams.get("prediction");
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const search = url.searchParams.get("search") || "";

  const where: any = {
    isActive: true,
    // Show global questions + centre-specific questions for the user's centre
    OR: [
      { centreId: null },
      ...(user!.centreId ? [{ centreId: user!.centreId }] : []),
    ],
    ...(section && { section }),
    ...(type && { type }),
    ...(difficulty && { difficulty }),
    ...(prediction === "true" && { isPrediction: true }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { tags: { hasSome: [search.toLowerCase()] } },
      ],
    }),
  };

  const [questions, total] = await Promise.all([
    db.question.findMany({
      where,
      select: {
        id: true,
        section: true,
        type: true,
        difficulty: true,
        title: true,
        isPrediction: true,
        tags: true,
        imageUrl: true,
        audioUrl: true,
        createdAt: true,
        _count: { select: { attempts: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ isPrediction: "desc" }, { createdAt: "desc" }],
    }),
    db.question.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: questions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

// POST /api/questions — create a question (admin only)
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const body = await req.json();
  const {
    section, type, difficulty, title, content, explanation,
    modelAnswer, audioUrl, imageUrl, tags, isPrediction,
  } = body;

  if (!section || !type || !title || !content) {
    return NextResponse.json(
      { success: false, error: "Section, type, title, and content are required" },
      { status: 400 }
    );
  }

  const question = await db.question.create({
    data: {
      section,
      type,
      difficulty: difficulty || "MEDIUM",
      title: title.trim(),
      content,
      explanation: explanation || null,
      modelAnswer: modelAnswer || null,
      audioUrl: audioUrl || null,
      imageUrl: imageUrl || null,
      tags: tags || [],
      isPrediction: isPrediction || false,
      // Centre-specific if centre admin, global if super admin
      centreId: user!.role === "SUPER_ADMIN" ? null : user!.centreId || null,
    },
  });

  return NextResponse.json(
    { success: true, data: question, message: "Question created" },
    { status: 201 }
  );
}
