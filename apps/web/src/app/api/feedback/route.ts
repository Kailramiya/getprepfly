import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { sendEmail, feedbackEmailTemplate } from "@/lib/email";
import { parseBody } from "@/lib/validation";

const FeedbackSchema = z.object({
  category: z.enum(["bug", "feature", "scoring", "question", "general"]).optional(),
  message: z.string().trim().min(1, "Message is required").max(5000),
  rating: z.coerce.number().int().min(0).max(5).optional(),
  userName: z.string().trim().max(120).optional(),
  userEmail: z.string().trim().max(200).optional(),
  centreName: z.string().trim().max(120).optional(),
});

// POST /api/feedback — submit user feedback + email notification
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const parsed = await parseBody(req, FeedbackSchema);
  if (!parsed.ok) return parsed.response;
  const { category, message, rating, userName, userEmail, centreName } = parsed.data;

  const feedbackUserName = userName || user!.name || "Unknown";
  const feedbackUserEmail = userEmail || user!.email || "Unknown";
  const feedbackCentreName = centreName || "None";

  // Save to database
  await db.announcement.create({
    data: {
      title: `[FEEDBACK:${category || "general"}] from ${feedbackUserName} ${rating ? `(${rating}/5)` : ""}`,
      message: `${message}\n\n---\nUser: ${feedbackUserName}\nEmail: ${feedbackUserEmail}\nCentre: ${feedbackCentreName}\nRating: ${rating || "Not rated"}\nDate: ${new Date().toISOString()}`,
      isGlobal: true,
      centreId: user!.centreId || null,
    },
  });

  // Send email notification (non-blocking — don't fail if email fails)
  sendEmail({
    subject: `[Prepfly Feedback] ${category || "general"} — from ${feedbackUserName}`,
    html: feedbackEmailTemplate({
      category: category || "general",
      message,
      rating: rating || 0,
      userName: feedbackUserName,
      userEmail: feedbackUserEmail,
      centreName: feedbackCentreName,
    }),
  }).catch(() => {
    // Silent fail — feedback is saved even if email fails
  });

  return NextResponse.json(
    { success: true, message: "Feedback submitted. Thank you!" },
    { status: 201 }
  );
}

// GET /api/feedback — list all feedback (super admin only)
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const feedbacks = await db.announcement.findMany({
    where: { title: { startsWith: "[FEEDBACK:" } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ success: true, data: feedbacks });
}
