import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { MODULE_PRICING, CENTRE_PLANS, activateCentrePlan, grantModuleAccess, isCentrePlanKey } from "@/lib/access";
import { parseBody } from "@/lib/validation";

const CreateOrderSchema = z.object({
  planType: z.string().min(1, "planType is required").max(60),
  couponCode: z.string().trim().max(60).optional(),
});

// Merge hardcoded plan metadata with DB-overridden amounts
async function resolvePlanAmount(planType: string): Promise<{ amount: number; label: string } | null> {
  // Check DB for a custom price first
  const dbPrice = await db.pricingSetting.findUnique({ where: { key: planType } });

  const hardcoded = isCentrePlanKey(planType) ? CENTRE_PLANS[planType] : MODULE_PRICING[planType];
  if (!hardcoded) return null;

  const amount = dbPrice ? dbPrice.amount : hardcoded.amount;
  const label = dbPrice ? dbPrice.label : hardcoded.label;
  return { amount, label };
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const parsed = await parseBody(req, CreateOrderSchema);
  if (!parsed.ok) return parsed.response;
  const { planType, couponCode } = parsed.data;

  const isCentrePlan = isCentrePlanKey(planType);

  // Resolve plan details (DB price overrides hardcoded)
  const plan = await resolvePlanAmount(planType);
  if (!plan) {
    return NextResponse.json(
      { success: false, error: "Invalid plan type" },
      { status: 400 }
    );
  }

  // Centre plans can only be purchased by centre admins
  if (isCentrePlan) {
    if (user!.role !== "CENTRE_ADMIN" && user!.role !== "SUPER_ADMIN") {
      return NextResponse.json({ success: false, error: "Only centre admins can purchase centre plans" }, { status: 403 });
    }
    if (!user!.centreId) {
      return NextResponse.json({ success: false, error: "You are not associated with a centre" }, { status: 400 });
    }
  }

  let finalPrice = plan.amount;
  let appliedCoupon: string | null = null;
  let couponError: string | null = null;

  // Apply coupon (student plans only). An invalid/expired/exhausted coupon
  // used to fail silently — the student would just see full price with no
  // explanation. Now the reason comes back in the response.
  if (couponCode && !isCentrePlan) {
    const coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!coupon) couponError = "Invalid coupon code";
    else if (!coupon.isActive) couponError = "This coupon is no longer active";
    else if (coupon.usedCount >= coupon.maxUses) couponError = "This coupon has reached its usage limit";
    else if (new Date() >= coupon.validUntil) couponError = "This coupon has expired";
    else {
      finalPrice = Math.round(plan.amount * (1 - coupon.discountPercent / 100));
      appliedCoupon = coupon.code; // persisted so usedCount is bumped on success
    }
  } else if (couponCode && isCentrePlan) {
    couponError = "Coupons apply to individual student plans only";
  }

  // If the price is exactly 0, completely bypass Razorpay and instantly grant access
  if (finalPrice === 0) {
    const payment = await db.payment.create({
      data: { amount: 0, status: "SUCCESS", planType, couponCode: appliedCoupon, method: "free" },
    });

    if (appliedCoupon) {
      await db.coupon.updateMany({
        where: { code: appliedCoupon },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (isCentrePlan) {
      await activateCentrePlan(user!.centreId!, planType, payment.id);
    } else {
      const modPlan = MODULE_PRICING[planType];
      await grantModuleAccess(user!.id, modPlan.section as any, payment.id, modPlan.days);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: "free_" + payment.id,
        amount: 0,
        currency: "INR",
        isFreeBypass: true, // Signals frontend to skip Razorpay modal
        planType,
        planLabel: plan.label,
        userName: user!.name,
        userEmail: user!.email,
        isCentrePlan,
        couponApplied: !!appliedCoupon,
        couponError,
      },
    });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ success: false, error: "Payment gateway not configured. Contact support." }, { status: 500 });
  }

  try {
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        amount: finalPrice,
        currency: "INR",
        receipt: `pf_${user!.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
        notes: { userId: user!.id, planType, centreId: user!.centreId || "", userEmail: user!.email },
      }),
    });

    const order = await razorpayRes.json();
    if (!razorpayRes.ok) {
      return NextResponse.json({ success: false, error: order.error?.description || "Failed to create order" }, { status: 500 });
    }

    await db.payment.create({
      data: { amount: finalPrice, status: "PENDING", razorpayOrderId: order.id, planType, couponCode: appliedCoupon },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: finalPrice,
        currency: "INR",
        keyId,
        planType,
        planLabel: plan.label,
        userName: user!.name,
        userEmail: user!.email,
        isCentrePlan,
        couponApplied: !!appliedCoupon,
        couponError,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Payment creation failed. Please try again." }, { status: 500 });
  }
}
