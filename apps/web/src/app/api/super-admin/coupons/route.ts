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
  // Number(...) < 1 is false for non-numeric input (NaN comparisons are
  // always false), so a bad discountPercent used to sail through validation
  // and land in the DB as NaN — which create-order would then multiply into
  // every price for that coupon, breaking checkout for anyone who used it.
  const discount = Number(discountPercent);
  if (!Number.isFinite(discount) || discount < 1 || discount > 100) {
    return NextResponse.json({ success: false, error: "discountPercent must be a number between 1 and 100" }, { status: 400 });
  }
  const validUntilDate = new Date(validUntil);
  if (isNaN(validUntilDate.getTime())) {
    return NextResponse.json({ success: false, error: "validUntil must be a valid date" }, { status: 400 });
  }

  const existing = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) return NextResponse.json({ success: false, error: "Coupon code already exists" }, { status: 409 });

  const coupon = await db.coupon.create({
    data: {
      code: code.toUpperCase().trim(),
      discountPercent: discount,
      maxUses: Number(maxUses) || 100,
      validUntil: validUntilDate,
    },
  });

  return NextResponse.json({ success: true, data: coupon }, { status: 201 });
}
