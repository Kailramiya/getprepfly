import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_PRICES } from "@/lib/pricing-defaults";

export const dynamic = "force-dynamic";

// GET /api/pricing — returns current plan prices (DB overrides default if set)
export async function GET() {
  let rows: { key: string; amount: number }[] = [];
  try {
    rows = await db.pricingSetting.findMany({
      select: { key: true, amount: true },
    });
  } catch (error) {
    console.error("[Pricing] Failed to load DB overrides, using defaults:", error);
  }

  const byKey: Record<string, number> = {};
  for (const r of rows) byKey[r.key] = r.amount;

  const result: Record<string, number> = {};
  for (const [key, def] of Object.entries(DEFAULT_PRICES)) {
    result[key] = byKey[key] ?? def.amount;
  }

  return NextResponse.json({ success: true, data: result });
}
