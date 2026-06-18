import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { parseBody, passwordSchema } from "@/lib/validation";

const ResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
});

export async function POST(req: NextRequest) {
  // Per-IP throttle — prevents brute-forcing reset tokens.
  const limited = await enforceRateLimit("auth", clientIp(req));
  if (limited) return limited;

  const parsed = await parseBody(req, ResetSchema);
  if (!parsed.ok) return parsed.response;
  const { token, password } = parsed.data;

  const resetToken = await db.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken) {
    return NextResponse.json({ success: false, error: "Invalid or expired reset link" }, { status: 400 });
  }

  if (resetToken.expiresAt < new Date()) {
    await db.passwordResetToken.delete({ where: { token } });
    return NextResponse.json({ success: false, error: "Reset link has expired. Please request a new one." }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { email: resetToken.email } });
  if (!user) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Update password and invalidate all sessions (force re-login)
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash, activeSessionId: null },
  });

  // Delete used token
  await db.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ success: true });
}
