import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { getUserAccess, PTESection } from "@/lib/access";

// GET /api/questions — list questions with filters (respects user's module access)
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
  const full = url.searchParams.get("full") === "1"; // include content + URLs in list

  // Build access-based visibility conditions:
  //   1. Public questions (isPublic=true) - visible to everyone
  //   2. Centre-specific questions - visible only to that centre's users
  //   3. Premium questions - visible only to users who purchased that module
  const isAdmin = user!.role === "SUPER_ADMIN" || user!.role === "CENTRE_ADMIN" || user!.role === "TEACHER";

  let visibilityConditions: any[] = [];

  if (isAdmin) {
    // Admins see all questions they have rights to
    visibilityConditions = [
      { centreId: null },
      ...(user!.centreId ? [{ centreId: user!.centreId }] : []),
    ];
  } else {
    // Students: see public + centre-specific + purchased modules + SPEAKING (free practice)
    const access = await getUserAccess(user!.id);
    const accessibleSections: PTESection[] = access.hasAllAccess
      ? ["SPEAKING", "WRITING", "READING", "LISTENING"]
      : Array.from(access.modules);

    // Speaking is always accessible for practice (even without purchase after trial)
    if (access.canPracticeSpeaking && !accessibleSections.includes("SPEAKING")) {
      accessibleSections.push("SPEAKING");
    }

    visibilityConditions = [
      { isPublic: true }, // public questions are free for all
      ...(user!.centreId ? [{ centreId: user!.centreId }] : []), // own centre's questions
      ...(accessibleSections.length > 0
        ? [{ section: { in: accessibleSections } }]
        : []),
    ];
  }

  const where: any = {
    isActive: true,
    AND: [
      { OR: visibilityConditions },
      ...(search
        ? [{
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { tags: { hasSome: [search.toLowerCase()] } },
            ],
          }]
        : []),
    ],
    ...(section && { section }),
    ...(type && { type }),
    ...(difficulty && { difficulty }),
    ...(prediction === "true" && { isPrediction: true }),
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
        isPublic: true,
        tags: true,
        imageUrl: true,
        audioUrl: true,
        marks: true,
        createdAt: true,
        // Only include heavy fields when explicitly requested
        ...(full && {
          content: true,
          explanation: true,
          modelAnswer: true,
        }),
        _count: { select: { attempts: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ isPrediction: "desc" }, { createdAt: "desc" }],
    }),
    db.question.count({ where }),
  ]);

  const res = NextResponse.json({
    success: true,
    data: {
      items: questions,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });

  // Browser cache for 30s — questions list rarely changes
  res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300");
  return res;
}

// POST /api/questions — create a question (admin only)
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const body = await req.json();
  const {
    section, type, difficulty, title, content, explanation,
    modelAnswer, audioUrl, imageUrl, tags, isPrediction, marks, isPublic,
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
      marks: typeof marks === "number" && marks > 0 ? marks : 1,
      // Only super admin can mark questions as public
      isPublic: user!.role === "SUPER_ADMIN" ? !!isPublic : false,
      // Centre-specific if centre admin, global if super admin
      centreId: user!.role === "SUPER_ADMIN" ? null : user!.centreId || null,
    },
  });

  return NextResponse.json(
    { success: true, data: question, message: "Question created" },
    { status: 201 }
  );
}
