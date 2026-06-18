import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { parseBody, emailSchema } from "@/lib/validation";
import { sendVerificationEmail } from "@/lib/email-verification";

const ResendSchema = z.object({ email: emailSchema });

// POST /api/auth/resend-verification — re-send a verification email
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit("auth", clientIp(req));
  if (limited) return limited;

  const parsed = await parseBody(req, ResendSchema);
  if (!parsed.ok) return parsed.response;
  const { email } = parsed.data;

  // Always respond success to avoid leaking which emails are registered.
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
    await sendVerificationEmail(email, user.name).catch((e) =>
      console.error("[resend-verification] failed:", e)
    );
  }

  return NextResponse.json({
    success: true,
    message: "If that account exists and is unverified, a new verification email has been sent.",
  });
}
