import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { grantCentreSeat, getCentreActiveSeats, withCentreSeatLock } from "@/lib/centre-access";
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

  // Check-then-grant-all runs inside one locked transaction — see
  // withCentreSeatLock's doc comment. Without this, a concurrent
  // invite/import/renew request for the same centre could grant seats
  // between this check and the loop below, letting the combined total
  // exceed maxStudents.
  const outcome = await withCentreSeatLock(centreId, async (tx) => {
    if (sub && sub.maxStudents !== -1) {
      const activeSeats = await getCentreActiveSeats(centreId, tx);
      // Count students without an active seat (they'd consume a new slot)
      const seats = await tx.centreStudentSeat.findMany({
        where: { centreId, userId: { in: students.map(s => s.id) }, status: "ACTIVE" },
        select: { userId: true },
      });
      const existingSeats = new Set(seats.map(s => s.userId));

      const newSlots = students.filter(s => !existingSeats.has(s.id)).length;
      if (activeSeats + newSlots > sub.maxStudents) {
        return { ok: false as const };
      }
    }

    let renewed = 0;
    const failed: string[] = [];
    for (const student of students) {
      try {
        await grantCentreSeat(centreId, student.id, tx);
        renewed++;
      } catch {
        failed.push(student.name);
      }
    }
    return { ok: true as const, renewed, failed };
  });

  if (!outcome.ok) {
    return NextResponse.json({
      success: false,
      error: `Seat limit would be exceeded (${sub!.maxStudents} max). Remove inactive students or upgrade your plan.`,
    }, { status: 403 });
  }

  const { renewed, failed } = outcome;
  return NextResponse.json({
    success: true,
    data: { renewed, failed, message: `${renewed} student${renewed !== 1 ? "s" : ""} renewed for 30 days.` },
  });
}
