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
  const fetchAll = url.searchParams.get("all") === "1";
  const search = url.searchParams.get("search") || "";
  const full = url.searchParams.get("full") === "1"; // include content + URLs in list
  const centreFilter = url.searchParams.get("centreId"); // filter by specific centre (super admin only)
  const mockTestOnly = url.searchParams.get("mockTestOnly") === "true"; // only questions used in mock tests
  const sortBy = url.searchParams.get("sort") || "createdAt"; // createdAt | title
  const sortOrder = url.searchParams.get("order") === "asc" ? "asc" : "desc";

  // Build access-based visibility conditions:
  //   1. Public questions (isPublic=true) - visible to everyone
  //   2. Centre-specific questions - visible only to that centre's users
  //   3. Premium questions - visible only to users who purchased that module
  const isSuperAdmin = user!.role === "SUPER_ADMIN";
  const isCentreStaff = user!.role === "CENTRE_ADMIN" || user!.role === "TEACHER";
  const isAdmin = isSuperAdmin || isCentreStaff;

  let visibilityConditions: any[] = [];

  if (isSuperAdmin) {
    // Super admin sees EVERY question (across all centres + global)
    visibilityConditions = [{}]; // no restriction
  } else if (isCentreStaff) {
    // Centre admin / teacher sees global + their own centre's questions
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
    // Super admin can filter by specific centre (or "global" = centreId null)
    ...(centreFilter === "global" && isAdmin
      ? { centreId: null }
      : centreFilter && isAdmin
        ? { centreId: centreFilter }
        : {}),
    // Filter to only questions assigned to at least one mock test
    ...(mockTestOnly && isSuperAdmin && { mockTestQuestions: { some: {} } }),
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
        centreId: true,
        // Include centre info so super admin can group/filter
        centre: { select: { id: true, name: true, slug: true } },
        // Only include heavy fields when explicitly requested
        ...(full && {
          content: true,
          explanation: true,
          modelAnswer: true,
        }),
        _count: { select: { attempts: true } },
      },
      ...(fetchAll ? {} : { skip: (page - 1) * pageSize, take: pageSize }),
      orderBy:
        sortBy === "title"
          ? [{ title: sortOrder }]
          : [{ isPrediction: "desc" }, { createdAt: sortOrder }],
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

  // No HTTP cache — admin pages need fresh data after edits/deletes.
  // (Optimistic UI updates handle perceived speed; browser-cached lists hide deletions.)
  res.headers.set("Cache-Control", "no-store");
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

  // Determine if the question should be auto-public.
  // Three sources of "public":
  //   1. Super admin explicitly sets isPublic=true
  //   2. Centre admin/teacher belongs to a centre marked as official content
  let autoPublic = false;
  if (user!.role === "SUPER_ADMIN" && isPublic) {
    autoPublic = true;
  } else if (user!.centreId) {
    const centre = await db.centre.findUnique({
      where: { id: user!.centreId },
      select: { isOfficialContent: true },
    });
    if (centre?.isOfficialContent) autoPublic = true;
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
      isPublic: autoPublic,
      // Centre-specific if centre admin, global if super admin
      centreId: user!.role === "SUPER_ADMIN" ? null : user!.centreId || null,
    },
  });

  return NextResponse.json(
    { success: true, data: question, message: "Question created" },
    { status: 201 }
  );
}
