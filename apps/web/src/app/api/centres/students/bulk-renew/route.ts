import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { grantCentreSeat, getCentreActiveSeats } from "@/lib/centre-access";
import { db } from "@/lib/db";

// POST /api/centres/students/bulk-renew
// Body: { userIds: string[] }
// Renews each student's seat for 30 days from today, respecting the seat cap.
export async function POST(req: NextRequest) {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  const centreId = user!.centreId;
  if (!centreId) return NextResponse.json({ success: false, error: "No centre" }, { status: 400 });

  const { userIds } = await req.json();
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ success: false, error: "userIds required" }, { status: 400 });
  }
  if (userIds.length > 200) {
    return NextResponse.json({ success: false, error: "Max 200 students per batch renew" }, { status: 400 });
  }

  // Verify all students belong to this centre
  const students = await db.user.findMany({
    where: { id: { in: userIds }, centreId, role: "STUDENT" },
    select: { id: true, name: true },
  });
  if (students.length === 0) {
    return NextResponse.json({ success: false, error: "No valid students found" }, { status: 404 });
  }

  // Check seat cap (count how many are genuinely new — no active seat)
  const sub = await db.centreSubscription.findFirst({
    where: { centreId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { maxStudents: true },
  });

  if (sub && sub.maxStudents !== -1) {
    const activeSeats = await getCentreActiveSeats(centreId);
    // Count students without an active seat (they'd consume a new slot)
    const existingSeats: string[] = [];
    const seats = await db.centreStudentSeat.findMany({
      where: { centreId, userId: { in: students.map(s => s.id) }, status: "ACTIVE" },
      select: { userId: true },
    });
    seats.forEach(s => existingSeats.push(s.userId));

    const newSlots = students.filter(s => !existingSeats.includes(s.id)).length;
    if (activeSeats + newSlots > sub.maxStudents) {
      return NextResponse.json({
        success: false,
        error: `Seat limit would be exceeded (${sub.maxStudents} max). Remove inactive students or upgrade your plan.`,
      }, { status: 403 });
    }
  }

  // Renew each student
  let renewed = 0;
  const failed: string[] = [];
  for (const student of students) {
    try {
      await grantCentreSeat(centreId, student.id);
      renewed++;
    } catch {
      failed.push(student.name);
    }
  }

  return NextResponse.json({
    success: true,
    data: { renewed, failed, message: `${renewed} student${renewed !== 1 ? "s" : ""} renewed for 30 days.` },
  });
}
