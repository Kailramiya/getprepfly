import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// POST /api/payments/create-order — create Razorpay order
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { planType, couponCode } = body;

  const PLANS: Record<string, { price: number; days: number; label: string }> = {
    VIP_30: { price: 49900, days: 30, label: "VIP 30 Days" },
    VIP_90: { price: 99900, days: 90, label: "VIP 90 Days" },
    VIP_180: { price: 149900, days: 180, label: "VIP 180 Days" },
  };

  const plan = PLANS[planType];
  if (!plan) {
    return NextResponse.json({ success: false, error: "Invalid plan" }, { status: 400 });
  }

  let finalPrice = plan.price;

  // Apply coupon
  if (couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (coupon && coupon.isActive && coupon.usedCount < coupon.maxUses && new Date() < coupon.validUntil) {
      finalPrice = Math.round(plan.price * (1 - coupon.discountPercent / 100));
    }
  }

  // Create Razorpay order
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ success: false, error: "Payment gateway not configured" }, { status: 500 });
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
        receipt: `pte_${user!.id}_${Date.now()}`,
        notes: {
          userId: user!.id,
          planType,
          userEmail: user!.email,
        },
      }),
    });

    const order = await razorpayRes.json();

    if (!razorpayRes.ok) {
      throw new Error(order.error?.description || "Failed to create order");
    }

    // Save payment record
    const studentPlan = await db.studentPlan.findUnique({ where: { userId: user!.id } });
    if (studentPlan) {
      await db.payment.create({
        data: {
          amount: finalPrice,
          status: "PENDING",
          razorpayOrderId: order.id,
          studentPlanId: studentPlan.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: finalPrice,
        currency: "INR",
        keyId,
        planLabel: plan.label,
        userName: user!.name,
        userEmail: user!.email,
      },
    });
  } catch (err: any) {
    console.error("Razorpay order error:", err);
    return NextResponse.json(
      { success: false, error: "Payment creation failed" },
      { status: 500 }
    );
  }
}
