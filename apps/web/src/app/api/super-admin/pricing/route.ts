import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";
import { DEFAULT_PRICES } from "@/lib/pricing-defaults";

// GET /api/super-admin/pricing — list all plan prices
export async function GET() {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const rows = await db.pricingSetting.findMany();
  const byKey: Record<string, { amount: number; label: string; maxStudents: number | null }> = {};
  for (const r of rows) byKey[r.key] = { amount: r.amount, label: r.label, maxStudents: r.maxStudents };

  const result = Object.entries(DEFAULT_PRICES).map(([key, def]) => ({
    key,
    label: byKey[key]?.label ?? def.label,
    amount: byKey[key]?.amount ?? def.amount,
    amountRupees: ((byKey[key]?.amount ?? def.amount) / 100).toFixed(0),
    maxStudents: byKey[key]?.maxStudents ?? def.maxStudents ?? null,
    isCustom: !!byKey[key],
  }));

  return NextResponse.json({ success: true, data: result });
}

// PUT /api/super-admin/pricing — update a plan price (and maxStudents for centre plans)
export async function PUT(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { key, amountRupees, maxStudents } = body;

  if (!key || !(key in DEFAULT_PRICES)) {
    return NextResponse.json({ success: false, error: "Invalid plan key" }, { status: 400 });
  }
  const parsedRupees = parseFloat(amountRupees);
  if (isNaN(parsedRupees) || parsedRupees < 0) {
    return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
  }

  const amount = Math.round(parsedRupees * 100);
  const label = DEFAULT_PRICES[key].label;

  // Only persist maxStudents for centre/annual plans
  const hasMaxStudents = DEFAULT_PRICES[key].maxStudents !== undefined;
  const parsedMax = maxStudents !== undefined && maxStudents !== null ? parseInt(maxStudents, 10) : null;
  const maxStudentsValue = hasMaxStudents && parsedMax !== null && !isNaN(parsedMax) ? parsedMax : undefined;

  const setting = await db.pricingSetting.upsert({
    where: { key },
    update: { amount, label, ...(maxStudentsValue !== undefined && { maxStudents: maxStudentsValue }) },
    create: { key, amount, label, ...(maxStudentsValue !== undefined && { maxStudents: maxStudentsValue }) },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...setting,
      amountRupees: (setting.amount / 100).toFixed(0),
      maxStudents: setting.maxStudents,
    },
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
