import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { sendEmail, resetPasswordEmailTemplate } from "@/lib/email";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Per-IP throttle — prevents reset-email flooding / enumeration probing.
  const limited = await enforceRateLimit("auth", clientIp(req));
  if (limited) return limited;

  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Always return success to prevent email enumeration
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Delete any existing tokens for this email
  await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

  // Generate secure token — expires in 1 hour
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.passwordResetToken.create({
    data: { email: normalizedEmail, token, expiresAt },
  });

  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await sendEmail({
    to: normalizedEmail,
    subject: "Reset your Prepfly password",
    html: resetPasswordEmailTemplate({ resetUrl, userName: user.name }),
  });

  return NextResponse.json({ success: true });
}
