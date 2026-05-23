import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET — fetch announcements for current user (global + their centre's)
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const isSuperAdmin = user!.role === "SUPER_ADMIN";

  const announcements = await db.announcement.findMany({
    where: {
      AND: [
        // Feedback entries (stored as announcements) are only visible to super admins
        ...(isSuperAdmin ? [] : [{ title: { not: { startsWith: "[FEEDBACK:" } } }]),
        {
          OR: [
            { isGlobal: true },
            ...(user!.centreId ? [{ centreId: user!.centreId }] : []),
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ success: true, data: announcements });
}

// POST — create announcement (centre admin = centre-only, super admin = global)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!["SUPER_ADMIN", "CENTRE_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const { title, message, isGlobal } = await req.json();
  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ success: false, error: "Title and message are required" }, { status: 400 });
  }

  const global = user!.role === "SUPER_ADMIN" && isGlobal === true;

  const announcement = await db.announcement.create({
    data: {
      title: title.trim(),
      message: message.trim(),
      isGlobal: global,
      centreId: global ? null : user!.centreId || null,
    },
  });

  return NextResponse.json({ success: true, data: announcement }, { status: 201 });
}

// DELETE
export async function DELETE(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await req.json();
  const ann = await db.announcement.findUnique({ where: { id } });
  if (!ann) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

  if (user!.role !== "SUPER_ADMIN" && ann.centreId !== user!.centreId) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  await db.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
