import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { fulfillPayment } from "@/lib/access";

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
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
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

  const notes = event.payload?.payment?.entity?.notes ?? {};
  try {
    await fulfillPayment(
      payment.id,
      { userId: notes.userId, centreId: notes.centreId || null },
      { razorpayPaymentId }
    );
  } catch (err) {
    // 5xx so Razorpay retries; fulfillPayment already released the claim.
    console.error("Webhook fulfilment failed", err);
    return NextResponse.json({ error: "fulfilment failed" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
