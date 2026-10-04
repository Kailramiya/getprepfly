import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { MODULE_PRICING, CENTRE_PLANS, fulfillPayment, isCentrePlanKey } from "@/lib/access";

function safeEqual(a: string, b: unknown): boolean {
  if (typeof b !== "string") return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// POST /api/payments/verify — verify Razorpay signature and grant module access
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json(
      { success: false, error: "Missing payment verification fields" },
      { status: 400 }
    );
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json(
      { success: false, error: "Payment gateway not configured" },
      { status: 500 }
    );
  }

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!safeEqual(expectedSignature, razorpay_signature)) {
    await db.payment.updateMany({
      // PENDING only: a forged call must not be able to downgrade a completed payment.
      where: { razorpayOrderId: razorpay_order_id, status: "PENDING" },
      data: { status: "FAILED" },
    });
    return NextResponse.json(
      { success: false, error: "Invalid signature — payment verification failed" },
      { status: 400 }
    );
  }

  const payment = await db.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
  });

  if (!payment) {
    return NextResponse.json(
      { success: false, error: "Payment record not found" },
      { status: 404 }
    );
  }

  if (payment.status === "SUCCESS") {
    return NextResponse.json({
      success: true,
      message: "Payment already verified",
      data: { planType: payment.planType },
    });
  }

  const planType = payment.planType;
  if (!planType || (!MODULE_PRICING[planType] && !CENTRE_PLANS[planType])) {
    return NextResponse.json({ success: false, error: "Invalid plan type on payment record" }, { status: 400 });
  }

  try {
    const { claimed } = await fulfillPayment(
      payment.id,
      { userId: user!.id, centreId: user!.centreId },
      { razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature }
    );
    if (!claimed) {
      // Webhook (or a double click) already granted access.
      return NextResponse.json({ success: true, message: "Payment already verified", data: { planType } });
    }
  } catch (err) {
    console.error("Payment fulfilment failed", err);
    return NextResponse.json({ success: false, error: "Could not activate your plan. Contact support." }, { status: 500 });
  }

  if (isCentrePlanKey(planType)) {
    const centrePlan = CENTRE_PLANS[planType];
    return NextResponse.json({
      success: true,
      message: `${centrePlan.label} activated for your centre`,
      data: { planType, label: centrePlan.label, daysGranted: centrePlan.days, isCentrePlan: true },
    });
  }

  const plan = MODULE_PRICING[planType];
  return NextResponse.json({
    success: true,
    message: `Access granted for ${plan.label}`,
    data: { planType, label: plan.label, daysGranted: plan.days, isCentrePlan: false },
  });
}
