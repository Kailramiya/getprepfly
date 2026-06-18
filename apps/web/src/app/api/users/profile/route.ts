import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";
import { passwordSchema } from "@/lib/validation";

// GET /api/users/profile — get current user profile
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const profile = await db.user.findUnique({
    where: { id: user!.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      role: true,
      language: true,
      examDate: true,
      dailyGoal: true,
      createdAt: true,
      centre: {
        select: { id: true, name: true, slug: true, logo: true, primaryColor: true, city: true, state: true },
      },
      studentPlan: {
        select: { planType: true, status: true, startDate: true, endDate: true },
      },
    },
  });

  return NextResponse.json({ success: true, data: profile });
}

// PATCH /api/users/profile — update profile
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const { name, phone, avatar, language, currentPassword, newPassword, examDate, dailyGoal } = body;

  const updateData: any = {};

  if (name?.trim()) updateData.name = name.trim();
  if (phone !== undefined) updateData.phone = phone || null;
  if (avatar !== undefined) updateData.avatar = avatar || null;
  if (language && ["EN", "HI", "PA"].includes(language)) updateData.language = language;

  // Exam date (engagement countdown) — accept ISO/date string or null to clear.
  if (examDate !== undefined) {
    if (!examDate) {
      updateData.examDate = null;
    } else {
      const d = new Date(examDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ success: false, error: "Invalid exam date" }, { status: 400 });
      }
      updateData.examDate = d;
    }
  }

  // Daily practice goal — clamp to a sane range.
  if (dailyGoal !== undefined) {
    const n = Math.round(Number(dailyGoal));
    if (!Number.isFinite(n) || n < 1 || n > 200) {
      return NextResponse.json({ success: false, error: "Daily goal must be between 1 and 200" }, { status: 400 });
    }
    updateData.dailyGoal = n;
  }

  // Password change
  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { success: false, error: "Current password is required to set a new password" },
        { status: 400 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user!.id },
      select: { passwordHash: true },
    });

    if (!dbUser?.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Cannot change password for Google sign-in accounts" },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    const pw = passwordSchema.safeParse(newPassword);
    if (!pw.success) {
      return NextResponse.json(
        { success: false, error: pw.error.issues[0]?.message || "Invalid password" },
        { status: 400 }
      );
    }

    updateData.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const updated = await db.user.update({
    where: { id: user!.id },
    data: updateData,
    select: { id: true, name: true, email: true, phone: true, avatar: true, language: true },
  });

  return NextResponse.json({ success: true, data: updated, message: "Profile updated" });
}
