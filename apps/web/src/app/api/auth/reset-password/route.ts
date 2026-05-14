import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ success: false, error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
  }

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
