import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/vocabulary — list vocabulary words (search + pagination)
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category");
  const difficulty = url.searchParams.get("difficulty");

  const where: any = {
    ...(search && {
      OR: [
        { word: { contains: search, mode: "insensitive" } },
        { meaning: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(category && { category }),
    ...(difficulty && { difficulty }),
  };

  const [items, total] = await Promise.all([
    db.vocabulary.findMany({
      where,
      orderBy: [{ dayNumber: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.vocabulary.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/vocabulary — add a new vocabulary word (centre admin or super admin)
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { word, meaning, meaningHi, meaningPa, example, category, difficulty, dayNumber } = body;

  if (!word?.trim() || !meaning?.trim() || !example?.trim()) {
    return NextResponse.json(
      { success: false, error: "Word, meaning, and example are required" },
      { status: 400 }
    );
  }

  try {
    const vocab = await db.vocabulary.create({
      data: {
        word: word.trim(),
        meaning: meaning.trim(),
        meaningHi: meaningHi?.trim() || null,
        meaningPa: meaningPa?.trim() || null,
        example: example.trim(),
        category: category?.trim() || null,
        difficulty: difficulty || "MEDIUM",
        dayNumber: dayNumber != null && dayNumber !== "" ? Number(dayNumber) : null,
      },
    });
    return NextResponse.json({ success: true, data: vocab }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ success: false, error: "This word already exists in the vocabulary list" }, { status: 409 });
    }
    throw err;
  }
}
