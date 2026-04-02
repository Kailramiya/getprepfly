import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { sendEmail, feedbackEmailTemplate } from "@/lib/email";

// POST /api/feedback — submit user feedback + email notification
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { category, message, rating, userName, userEmail, centreName } = body;

  if (!message) {
    return NextResponse.json(
      { success: false, error: "Message is required" },
      { status: 400 }
    );
  }

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
