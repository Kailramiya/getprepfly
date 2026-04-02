import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import bcrypt from "bcryptjs";

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
  const { name, phone, avatar, language, currentPassword, newPassword } = body;

  const updateData: any = {};

  if (name?.trim()) updateData.name = name.trim();
  if (phone !== undefined) updateData.phone = phone || null;
  if (avatar !== undefined) updateData.avatar = avatar || null;
  if (language && ["EN", "HI", "PA"].includes(language)) updateData.language = language;

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

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "New password must be at least 6 characters" },
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
