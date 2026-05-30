import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// Default prices used when no DB row exists (in paise)
export const DEFAULT_PRICES: Record<string, { amount: number; label: string }> = {
  MODULE_SPEAKING:  { amount: 19900,   label: "Speaking Module (per student)" },
  MODULE_WRITING:   { amount: 19900,   label: "Writing Module (per student)" },
  MODULE_READING:   { amount: 19900,   label: "Reading Module (per student)" },
  MODULE_LISTENING: { amount: 19900,   label: "Listening Module (per student)" },
  ALL_MODULES:      { amount: 59900,   label: "All 4 Modules Bundle (per student)" },
  CENTRE_STARTER:   { amount: 299900,  label: "Centre Starter Plan (50 students)" },
  CENTRE_GROWTH:    { amount: 699900,  label: "Centre Growth Plan (150 students)" },
  CENTRE_PRO:       { amount: 1499900, label: "Centre Pro Plan (500 students)" },
};

// GET /api/super-admin/pricing — list all plan prices
export async function GET() {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const rows = await db.pricingSetting.findMany();
  const byKey: Record<string, { amount: number; label: string }> = {};
  for (const r of rows) byKey[r.key] = { amount: r.amount, label: r.label };

  const result = Object.entries(DEFAULT_PRICES).map(([key, def]) => ({
    key,
    label: byKey[key]?.label ?? def.label,
    amount: byKey[key]?.amount ?? def.amount,
    amountRupees: ((byKey[key]?.amount ?? def.amount) / 100).toFixed(0),
    isCustom: !!byKey[key],
  }));

  return NextResponse.json({ success: true, data: result });
}

// PUT /api/super-admin/pricing — update a plan price
export async function PUT(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { key, amountRupees } = body;

  if (!key || !(key in DEFAULT_PRICES)) {
    return NextResponse.json({ success: false, error: "Invalid plan key" }, { status: 400 });
  }
  const parsedRupees = parseFloat(amountRupees);
  if (isNaN(parsedRupees) || parsedRupees < 0) {
    return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
  }

  const amount = Math.round(parsedRupees * 100);
  const label = DEFAULT_PRICES[key].label;

  const setting = await db.pricingSetting.upsert({
    where: { key },
    update: { amount, label },
    create: { key, amount, label },
  });

  return NextResponse.json({
    success: true,
    data: { ...setting, amountRupees: (setting.amount / 100).toFixed(0) },
  });
}

// DELETE /api/super-admin/pricing?key=xxx — reset to default
export async function DELETE(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ success: false, error: "key required" }, { status: 400 });

  await db.pricingSetting.deleteMany({ where: { key } });
  return NextResponse.json({ success: true });
}
