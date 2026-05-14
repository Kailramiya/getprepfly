import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!["CENTRE_ADMIN", "SUPER_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }
  const centreId = user!.centreId;
  if (!centreId) return NextResponse.json({ success: true, data: [] });

  const teachers = await db.user.findMany({
    where: { centreId, role: "TEACHER" },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: teachers });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!["CENTRE_ADMIN", "SUPER_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }
  const centreId = user!.centreId;
  if (!centreId) return NextResponse.json({ success: false, error: "No centre" }, { status: 400 });

  const { name, email, phone } = await req.json();
  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ success: false, error: "Name and email are required" }, { status: 400 });
  }

  const emailLower = email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    if (existing.centreId === centreId && existing.role === "TEACHER") {
      return NextResponse.json({ success: false, error: "Teacher already in your centre" }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: "Email already registered" }, { status: 409 });
  }

  // Auto-generate a temporary password
  const tempPassword = Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const teacher = await db.user.create({
    data: { name: name.trim(), email: emailLower, phone: phone || null, passwordHash, role: "TEACHER", centreId,
      studentPlan: { create: { planType: "FREE" } },
    },
    select: { id: true, name: true, email: true, phone: true, createdAt: true, isActive: true },
  });

  const centre = await db.centre.findUnique({ where: { id: centreId }, select: { name: true } });
  await sendEmail({
    to: emailLower,
    subject: `You've been added as a teacher at ${centre?.name} on Prepfly`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome to Prepfly, ${name}!</h2>
        <p>You have been added as a teacher at <strong>${centre?.name}</strong>.</p>
        <p>Your login credentials:</p>
        <ul>
          <li><strong>Email:</strong> ${emailLower}</li>
          <li><strong>Temporary Password:</strong> ${tempPassword}</li>
        </ul>
        <p>Please log in at <a href="${process.env.NEXTAUTH_URL}/login">${process.env.NEXTAUTH_URL}/login</a> and change your password immediately.</p>
      </div>
    `,
  });

  return NextResponse.json({ success: true, data: teacher }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;
  if (!["CENTRE_ADMIN", "SUPER_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }
  const { teacherId } = await req.json();
  const teacher = await db.user.findUnique({ where: { id: teacherId }, select: { centreId: true, role: true } });
  if (!teacher || teacher.centreId !== user!.centreId || teacher.role !== "TEACHER") {
    return NextResponse.json({ success: false, error: "Teacher not found in your centre" }, { status: 404 });
  }
  await db.user.update({ where: { id: teacherId }, data: { centreId: null } });
  return NextResponse.json({ success: true });
}
