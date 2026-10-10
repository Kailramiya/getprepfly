import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/coupons/validate?code=XXX — read-only check so the pricing page can
// preview the discount before the student commits to a purchase. Never
// mutates usedCount — only create-order (on actual purchase) does that.
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const code = (new URL(req.url).searchParams.get("code") || "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ success: false, error: "code is required" }, { status: 400 });
  }

  const coupon = await db.coupon.findUnique({ where: { code } });
  if (!coupon) {
    return NextResponse.json({ success: true, data: { valid: false, reason: "Invalid coupon code" } });
  }
  if (!coupon.isActive) {
    return NextResponse.json({ success: true, data: { valid: false, reason: "This coupon is no longer active" } });
  }
  if (coupon.usedCount >= coupon.maxUses) {
    return NextResponse.json({ success: true, data: { valid: false, reason: "This coupon has reached its usage limit" } });
  }
  if (new Date() >= coupon.validUntil) {
    return NextResponse.json({ success: true, data: { valid: false, reason: "This coupon has expired" } });
  }

  return NextResponse.json({ success: true, data: { valid: true, discountPercent: coupon.discountPercent } });
}
