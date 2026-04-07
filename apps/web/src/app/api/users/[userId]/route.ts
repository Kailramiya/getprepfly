import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// DELETE /api/users/[userId] — delete a user (super admin or centre admin for own centre)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  const { userId } = params;

  if (userId === user!.id) {
    return NextResponse.json(
      { success: false, error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, centreId: true },
  });

  if (!targetUser) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  // Centre admins can only delete students in their own centre
  if (user!.role === "CENTRE_ADMIN") {
    if (targetUser.centreId !== user!.centreId) {
      return NextResponse.json(
        { success: false, error: "You can only delete students from your own centre" },
        { status: 403 }
      );
    }
    if (targetUser.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, error: "You can only delete students, not admins" },
        { status: 403 }
      );
    }
  }

  // Super admins cannot delete other super admins
  if (targetUser.role === "SUPER_ADMIN" && user!.role === "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "Cannot delete another super admin" },
      { status: 403 }
    );
  }

  await db.user.delete({ where: { id: userId } });

  return NextResponse.json({
    success: true,
    message: `User "${targetUser.name}" deleted successfully`,
  });
}
