import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// POST /api/payments/verify — verify Razorpay payment signature
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ success: false, error: "Missing payment details" }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ success: false, error: "Payment gateway not configured" }, { status: 500 });
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    // Update payment as failed
    await db.payment.updateMany({
      where: { razorpayOrderId: razorpay_order_id },
      data: { status: "FAILED" },
    });
    return NextResponse.json({ success: false, error: "Payment verification failed" }, { status: 400 });
  }

  // Get payment record
  const payment = await db.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
    include: { studentPlan: true },
  });

  if (!payment) {
    return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
  }

  // Get plan type from Razorpay order notes
  const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
    headers: {
      Authorization: "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${keySecret}`).toString("base64"),
    },
  });
  const orderData = await orderRes.json();
  const planType = orderData.notes?.planType || "VIP_30";

  const PLAN_DAYS: Record<string, number> = { VIP_30: 30, VIP_90: 90, VIP_180: 180 };
  const days = PLAN_DAYS[planType] || 30;

  // Update payment + activate plan in transaction
  await db.$transaction([
    db.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        method: "razorpay",
      },
    }),
    db.studentPlan.update({
      where: { userId: user!.id },
      data: {
        planType: planType as any,
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  // Apply coupon usage if applicable
  if (orderData.notes?.couponCode) {
    await db.coupon.update({
      where: { code: orderData.notes.couponCode },
      data: { usedCount: { increment: 1 } },
    }).catch(() => {}); // silent fail if coupon doesn't exist
  }

  return NextResponse.json({
    success: true,
    message: "Payment successful! Your VIP plan is now active.",
    data: { planType, expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000) },
  });
}
