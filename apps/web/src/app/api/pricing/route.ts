import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_PRICES } from "@/lib/pricing-defaults";

// GET /api/pricing — returns current plan prices (DB overrides default if set)
export async function GET() {
  const rows = await db.pricingSetting.findMany();
  const byKey: Record<string, number> = {};
  for (const r of rows) byKey[r.key] = r.amount;

  const result: Record<string, number> = {};
  for (const [key, def] of Object.entries(DEFAULT_PRICES)) {
    result[key] = byKey[key] ?? def.amount;
  }

  return NextResponse.json({ success: true, data: result });
}
