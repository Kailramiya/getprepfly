import crypto from "crypto";
import { db } from "./db";
import { sendEmail, verifyEmailTemplate } from "./email";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Issue a fresh email-verification token for `email` and send the verification
 * link. Any existing tokens for the email are replaced. Returns whether the
 * email was dispatched (false if no email provider is configured).
 */
export async function sendVerificationEmail(email: string, name: string): Promise<boolean> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.emailVerificationToken.deleteMany({ where: { email } });
  await db.emailVerificationToken.create({ data: { email, token, expiresAt } });

  const base =
    process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const verifyUrl = `${base}/verify?token=${token}`;

  return sendEmail({
    to: email,
    subject: "Verify your Prepfly email",
    html: verifyEmailTemplate({ verifyUrl, userName: name }),
  });
}
