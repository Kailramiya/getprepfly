import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// DELETE /api/centres/students/[userId]
// Centre admin cancels a student's seat. Access is revoked immediately.
// No refund — payment is non-refundable per policy.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!["CENTRE_ADMIN", "SUPER_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const centreId = user!.centreId;
  if (!centreId) {
    return NextResponse.json({ success: false, error: "Not associated with a centre" }, { status: 400 });
  }

  const { userId } = params;

  // Verify the student belongs to this centre
  const student = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, centreId: true },
  });

  if (!student || student.centreId !== centreId) {
    return NextResponse.json({ success: false, error: "Student not found in your centre" }, { status: 404 });
  }

  // Cancel the seat
  const seat = await db.centreStudentSeat.findUnique({
    where: { centreId_userId: { centreId, userId } },
  });

  if (!seat) {
    return NextResponse.json({ success: false, error: "No active seat found for this student" }, { status: 404 });
  }

  if (seat.status === "CANCELLED") {
    return NextResponse.json({ success: false, error: "This student's access is already cancelled" }, { status: 409 });
  }

  await db.centreStudentSeat.update({
    where: { centreId_userId: { centreId, userId } },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({
    success: true,
    data: { message: `Access cancelled for ${student.name}. No refund will be issued.` },
  });
}

// GET /api/centres/students/[userId] — get seat details for a specific student
export async function GET(
  _req: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const centreId = user!.centreId;
  if (!centreId) {
    return NextResponse.json({ success: false, error: "Not associated with a centre" }, { status: 400 });
  }

  const seat = await db.centreStudentSeat.findUnique({
    where: { centreId_userId: { centreId, userId: params.userId } },
  });

  return NextResponse.json({ success: true, data: seat });
}
