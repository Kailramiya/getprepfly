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

  // Case-insensitive pre-check, same reasoning as POST — only matters when
  // the word is actually changing to something else.
  if (word.trim().toLowerCase() !== existing.word.toLowerCase()) {
    const dupe = await db.vocabulary.findFirst({ where: { word: { equals: word.trim(), mode: "insensitive" } } });
    if (dupe) {
      return NextResponse.json({ success: false, error: "This word already exists in the vocabulary list" }, { status: 409 });
    }
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
//
// Super admin only: Vocabulary has no per-centre scoping at all (unlike
// Question, which has centreId), so every word is shown to every student on
// the platform regardless of which centre added it. Letting any centre admin
// delete shared, cross-tenant content is a real risk — this restriction is a
// stop-gap. The proper fix is giving Vocabulary the same centreId/isPublic
// scoping Question already has, which needs a schema migration.
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const existing = await db.vocabulary.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ success: false, error: "Vocabulary word not found" }, { status: 404 });
  }

  // VocabProgress has no cascade on this relation, so deleting a word any
  // student has reviewed would otherwise fail with an unhandled FK error.
  await db.$transaction([
    db.vocabProgress.deleteMany({ where: { vocabId: params.id } }),
    db.vocabulary.delete({ where: { id: params.id } }),
  ]);
  return NextResponse.json({ success: true });
}
