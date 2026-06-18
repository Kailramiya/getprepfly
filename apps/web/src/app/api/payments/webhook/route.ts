import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { grantModuleAccess, MODULE_PRICING, activateCentrePlan, PTESection } from "@/lib/access";

// POST /api/payments/webhook — Razorpay server-side webhook
// Handles payment.captured event to grant access even if client disconnects
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";

  // Verify webhook signature
  const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try { event = JSON.parse(body); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (event.event !== "payment.captured") {
    return NextResponse.json({ status: "ignored" });
  }

  const razorpayPaymentId = event.payload?.payment?.entity?.id;
  const razorpayOrderId = event.payload?.payment?.entity?.order_id;

  if (!razorpayOrderId) return NextResponse.json({ status: "no order id" });

  const payment = await db.payment.findUnique({ where: { razorpayOrderId } });
  if (!payment || payment.status === "SUCCESS") {
    return NextResponse.json({ status: "already processed or not found" });
  }

  const planType = payment.planType;
  const isCentrePlan = planType?.startsWith("CENTRE_");

  const updatedPayment = await db.payment.update({
    where: { id: payment.id },
    data: { status: "SUCCESS", razorpayPaymentId, method: "razorpay" },
  });

  // Redeem coupon once (guarded by the status check above).
  if (payment.couponCode) {
    await db.coupon.updateMany({
      where: { code: payment.couponCode },
      data: { usedCount: { increment: 1 } },
    });
  }

  if (isCentrePlan && planType) {
    // Find the centre admin who created this order via notes
    const centreNote = event.payload?.payment?.entity?.notes?.centreId;
    if (centreNote) {
      await activateCentrePlan(centreNote, planType, updatedPayment.id);
    }
  } else if (planType && MODULE_PRICING[planType]) {
    const plan = MODULE_PRICING[planType];
    const userNote = event.payload?.payment?.entity?.notes?.userId;
    if (userNote) {
      await grantModuleAccess(userNote, plan.section as PTESection | null, updatedPayment.id, plan.days);
    }
  }

  return NextResponse.json({ status: "ok" });
}
