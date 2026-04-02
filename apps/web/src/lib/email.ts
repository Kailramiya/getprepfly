import nodemailer from "nodemailer";

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || "amankundu369@gmail.com";

// Gmail SMTP — uses App Password (not your regular password)
// Setup: Google Account → Security → 2-Step Verification → App Passwords → generate one
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL || "",
    pass: process.env.SMTP_PASSWORD || "", // Gmail App Password (16 chars, no spaces)
  },
});

interface SendEmailOptions {
  to?: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<boolean> {
  const smtpEmail = process.env.SMTP_EMAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpEmail || !smtpPassword) {
    console.warn("[Email] SMTP not configured — skipping email notification");
    return false;
  }

  try {
    await transporter.sendMail({
      from: `"Prepfly" <${smtpEmail}>`,
      to: to || ADMIN_EMAIL,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send:", err);
    return false;
  }
}

export function feedbackEmailTemplate({
  category,
  message,
  rating,
  userName,
  userEmail,
  centreName,
}: {
  category: string;
  message: string;
  rating: number;
  userName: string;
  userEmail: string;
  centreName: string;
}): string {
  const stars = rating > 0 ? "⭐".repeat(rating) + "☆".repeat(5 - rating) : "Not rated";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #14B8A6, #4F46E5); padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <h2 style="color: white; margin: 0; font-size: 18px;">📬 New Feedback on Prepfly</h2>
      </div>

      <div style="border: 1px solid #E5E7EB; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #6B7280; width: 100px;">Category</td>
            <td style="padding: 8px 0; font-weight: 600; color: #111827;">
              ${category === "bug" ? "🐛 Bug Report" :
                category === "feature" ? "💡 Feature Request" :
                category === "scoring" ? "🎯 AI Scoring" :
                category === "question" ? "❓ Question Issue" : "💬 General"}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Rating</td>
            <td style="padding: 8px 0; font-size: 16px;">${stars}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">From</td>
            <td style="padding: 8px 0; color: #111827;">${userName} (${userEmail})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6B7280;">Centre</td>
            <td style="padding: 8px 0; color: #111827;">${centreName || "No centre"}</td>
          </tr>
        </table>

        <div style="margin-top: 16px; padding: 16px; background: #F9FAFB; border-radius: 8px; border-left: 4px solid #14B8A6;">
          <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message}</p>
        </div>

        <p style="margin-top: 16px; font-size: 12px; color: #9CA3AF;">
          Sent from Prepfly Beta • ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
        </p>
      </div>
    </div>
  `;
}
