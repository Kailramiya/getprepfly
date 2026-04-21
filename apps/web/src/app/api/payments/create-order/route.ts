import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { MODULE_PRICING } from "@/lib/access";

// POST /api/payments/create-order — create Razorpay order for a module purchase
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { planType, couponCode } = body;

  const plan = MODULE_PRICING[planType];
  if (!plan) {
    return NextResponse.json(
      { success: false, error: "Invalid plan. Use MODULE_SPEAKING, MODULE_WRITING, MODULE_READING, MODULE_LISTENING, or ALL_MODULES" },
      { status: 400 }
    );
  }

  let finalPrice = plan.amount;

  // Apply coupon if provided
  if (couponCode) {
    const coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (
      coupon &&
      coupon.isActive &&
      coupon.usedCount < coupon.maxUses &&
      new Date() < coupon.validUntil
    ) {
      finalPrice = Math.round(plan.amount * (1 - coupon.discountPercent / 100));
    }
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json(
      { success: false, error: "Payment gateway not configured. Contact support." },
      { status: 500 }
    );
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
        notes: {
          userId: user!.id,
          planType,
          userEmail: user!.email,
        },
      }),
    });

    const order = await razorpayRes.json();

    if (!razorpayRes.ok) {
      console.error("Razorpay order error:", order);
      return NextResponse.json(
        { success: false, error: order.error?.description || "Failed to create order" },
        { status: 500 }
      );
    }

    // Save pending payment record
    await db.payment.create({
      data: {
        amount: finalPrice,
        status: "PENDING",
        razorpayOrderId: order.id,
        planType,
      },
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
      },
    });
  } catch (err: any) {
    console.error("Razorpay order error:", err);
    return NextResponse.json(
      { success: false, error: "Payment creation failed. Please try again." },
      { status: 500 }
    );
  }
}
