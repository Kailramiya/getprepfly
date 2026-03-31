import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";

// POST /api/feedback — submit user feedback
// Stored as announcements with isGlobal=false for now
// TODO: Create a dedicated Feedback model when needed
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

  // Store feedback as an announcement (reusing existing model)
  // Title format: [FEEDBACK:category] from userName
  await db.announcement.create({
    data: {
      title: `[FEEDBACK:${category || "general"}] from ${userName || user!.email} ${rating ? `(${rating}/5)` : ""}`,
      message: `${message}\n\n---\nUser: ${userName || "Unknown"}\nEmail: ${userEmail || user!.email}\nCentre: ${centreName || "None"}\nRating: ${rating || "Not rated"}\nDate: ${new Date().toISOString()}`,
      isGlobal: true, // visible to super admin
      centreId: user!.centreId || null,
    },
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
