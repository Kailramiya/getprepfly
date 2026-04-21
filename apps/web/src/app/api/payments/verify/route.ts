import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { grantModuleAccess, MODULE_PRICING, PTESection } from "@/lib/access";

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

  if (expectedSignature !== razorpay_signature) {
    await db.payment.updateMany({
      where: { razorpayOrderId: razorpay_order_id },
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
  if (!planType || !MODULE_PRICING[planType]) {
    return NextResponse.json(
      { success: false, error: "Invalid plan type on payment record" },
      { status: 400 }
    );
  }

  const plan = MODULE_PRICING[planType];

  const updatedPayment = await db.payment.update({
    where: { id: payment.id },
    data: {
      status: "SUCCESS",
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      method: "razorpay",
    },
  });

  await grantModuleAccess(user!.id, plan.section as PTESection | null, updatedPayment.id, 30);

  return NextResponse.json({
    success: true,
    message: `Access granted for ${plan.label}`,
    data: {
      planType,
      label: plan.label,
      daysGranted: 30,
    },
  });
}
