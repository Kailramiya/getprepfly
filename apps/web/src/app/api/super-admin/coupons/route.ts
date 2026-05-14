import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function GET() {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ success: true, data: coupons });
}

export async function POST(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { code, discountPercent, maxUses, validUntil } = await req.json();

  if (!code || !discountPercent || !validUntil) {
    return NextResponse.json({ success: false, error: "code, discountPercent and validUntil are required" }, { status: 400 });
  }
  if (discountPercent < 1 || discountPercent > 100) {
    return NextResponse.json({ success: false, error: "discountPercent must be between 1 and 100" }, { status: 400 });
  }

  const existing = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) return NextResponse.json({ success: false, error: "Coupon code already exists" }, { status: 409 });

  const coupon = await db.coupon.create({
    data: {
      code: code.toUpperCase().trim(),
      discountPercent: Number(discountPercent),
      maxUses: Number(maxUses) || 100,
      validUntil: new Date(validUntil),
    },
  });

  return NextResponse.json({ success: true, data: coupon }, { status: 201 });
}
