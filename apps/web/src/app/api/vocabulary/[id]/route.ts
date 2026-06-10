import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// PATCH /api/vocabulary/:id — update a vocabulary word
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  const existing = await db.vocabulary.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Vocabulary word not found" }, { status: 404 });
  }

  const body = await req.json();
  const { word, meaning, meaningHi, meaningPa, example, category, difficulty, dayNumber } = body;

  if (!word?.trim() || !meaning?.trim() || !example?.trim()) {
    return NextResponse.json(
      { success: false, error: "Word, meaning, and example are required" },
      { status: 400 }
    );
  }

  try {
    const vocab = await db.vocabulary.update({
      where: { id: params.id },
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
    return NextResponse.json({ success: true, data: vocab });
  } catch (err: any) {
    if (err.code === "P2002") {
      return NextResponse.json({ success: false, error: "This word already exists in the vocabulary list" }, { status: 409 });
    }
    throw err;
  }
}

// DELETE /api/vocabulary/:id — remove a vocabulary word
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  const existing = await db.vocabulary.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Vocabulary word not found" }, { status: 404 });
  }

  await db.vocabulary.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
