import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

const MAX_ROWS = 500;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

// POST /api/vocabulary/bulk — bulk-add vocabulary words from a CSV import.
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const words = body?.words;
  if (!Array.isArray(words) || words.length === 0) {
    return NextResponse.json({ success: false, error: "No words provided" }, { status: 400 });
  }
  if (words.length > MAX_ROWS) {
    return NextResponse.json({ success: false, error: `Maximum ${MAX_ROWS} words per batch` }, { status: 400 });
  }

  // Validate each row and drop duplicates WITHIN the batch (case-insensitive —
  // the DB's unique constraint on `word` is case-sensitive, so two rows that
  // only differ by case would otherwise both pass it).
  const seen = new Set<string>();
  const skipped: Array<{ row: number; reason: string }> = [];
  const valid: Array<{
    word: string; meaning: string; meaningHi: string | null; meaningPa: string | null;
    example: string; category: string | null; difficulty: Difficulty; dayNumber: number | null;
  }> = [];

  words.forEach((w: any, i: number) => {
    const word = String(w?.word ?? "").trim();
    const meaning = String(w?.meaning ?? "").trim();
    const example = String(w?.example ?? "").trim();
    if (!word || !meaning || !example) {
      skipped.push({ row: i + 1, reason: "Missing word, meaning, or example" });
      return;
    }
    const key = word.toLowerCase();
    if (seen.has(key)) {
      skipped.push({ row: i + 1, reason: `Duplicate of another row in this file ("${word}")` });
      return;
    }
    seen.add(key);
    const rawDifficulty = String(w?.difficulty ?? "").toUpperCase();
    const difficulty: Difficulty = (DIFFICULTIES as readonly string[]).includes(rawDifficulty)
      ? (rawDifficulty as Difficulty)
      : "MEDIUM";
    valid.push({
      word,
      meaning,
      meaningHi: String(w?.meaningHi ?? "").trim() || null,
      meaningPa: String(w?.meaningPa ?? "").trim() || null,
      example,
      category: String(w?.category ?? "").trim() || null,
      difficulty,
      dayNumber: w?.dayNumber != null && w.dayNumber !== "" ? Number(w.dayNumber) : null,
    });
  });

  if (valid.length === 0) {
    return NextResponse.json({ success: false, error: "No valid rows to import", data: { skipped } }, { status: 400 });
  }

  // Case-insensitive de-dup against words that already exist.
  const existing = await db.vocabulary.findMany({ select: { word: true } });
  const existingLower = new Set(existing.map((r) => r.word.toLowerCase()));
  const toCreate = valid.filter((v) => !existingLower.has(v.word.toLowerCase()));
  const skippedExisting = valid.length - toCreate.length;

  const created = toCreate.length > 0
    ? await db.vocabulary.createMany({ data: toCreate, skipDuplicates: true })
    : { count: 0 };

  return NextResponse.json(
    { success: true, data: { created: created.count, skippedInvalid: skipped.length, skippedExisting, skipped } },
    { status: 201 }
  );
}
