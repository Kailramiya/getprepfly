import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { parseBody } from "@/lib/validation";

const VerifySchema = z.object({ token: z.string().min(1, "Token is required") });

// POST /api/auth/verify-email — confirm an email-verification token
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit("auth", clientIp(req));
  if (limited) return limited;

  const parsed = await parseBody(req, VerifySchema);
  if (!parsed.ok) return parsed.response;
  const { token } = parsed.data;

  const record = await db.emailVerificationToken.findUnique({ where: { token } });
  if (!record) {
    return NextResponse.json(
      { success: false, error: "Invalid or already-used verification link" },
      { status: 400 }
    );
  }

  if (record.expiresAt < new Date()) {
    await db.emailVerificationToken.delete({ where: { token } }).catch(() => {});
    return NextResponse.json(
      { success: false, error: "This verification link has expired. Please request a new one." },
      { status: 400 }
    );
  }

  await db.user.updateMany({
    where: { email: record.email },
    data: { emailVerified: new Date() },
  });
  await db.emailVerificationToken.deleteMany({ where: { email: record.email } });

  return NextResponse.json({ success: true, message: "Email verified. You can now log in." });
}
