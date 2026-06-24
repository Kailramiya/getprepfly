import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_PRICES } from "@/lib/pricing-defaults";

export const dynamic = "force-dynamic";

// GET /api/pricing — returns current plan prices and maxStudents (DB overrides default if set)
export async function GET() {
  let rows: { key: string; amount: number; maxStudents: number | null }[] = [];
  try {
    rows = await db.pricingSetting.findMany({
      select: { key: true, amount: true, maxStudents: true },
    });
  } catch (error) {
    console.error("[Pricing] Failed to load DB overrides, using defaults:", error);
  }

  const byKey: Record<string, { amount: number; maxStudents: number | null }> = {};
  for (const r of rows) byKey[r.key] = { amount: r.amount, maxStudents: r.maxStudents };

  const result: Record<string, number> = {};
  const maxStudents: Record<string, number> = {};

  for (const [key, def] of Object.entries(DEFAULT_PRICES)) {
    result[key] = byKey[key]?.amount ?? def.amount;
    if (byKey[key]?.maxStudents != null) {
      maxStudents[key] = byKey[key].maxStudents!;
    }
  }

  return NextResponse.json({ success: true, data: result, maxStudents });
}
