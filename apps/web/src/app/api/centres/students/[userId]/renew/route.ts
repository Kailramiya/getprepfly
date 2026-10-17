import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { grantCentreSeat, getCentreActiveSeats, withCentreSeatLock } from "@/lib/centre-access";
import { db } from "@/lib/db";

// POST /api/centres/students/[userId]/renew — renew (reset to 30 days / 1 month) a student's seat
export async function POST(_req: NextRequest, { params }: { params: { userId: string } }) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!["CENTRE_ADMIN", "SUPER_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const centreId = user!.centreId;
  if (!centreId) return NextResponse.json({ success: false, error: "No centre" }, { status: 400 });

  const student = await db.user.findUnique({ where: { id: params.userId }, select: { id: true, name: true, centreId: true } });
  if (!student || student.centreId !== centreId) {
    return NextResponse.json({ success: false, error: "Student not in your centre" }, { status: 404 });
  }

  // Check-then-grant inside one locked transaction — see withCentreSeatLock's
  // doc comment. A concurrent invite/import/renew for this centre could
  // otherwise interleave between the check and the grant below.
  const latestSub = await db.centreSubscription.findFirst({ where: { centreId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  const result = await withCentreSeatLock(centreId, async (tx) => {
    // Check seat limit for new seats (cancelled students re-added count as new)
    const seat = await tx.centreStudentSeat.findUnique({ where: { centreId_userId: { centreId, userId: params.userId } } });
    const isNew = !seat || seat.status === "CANCELLED";
    // -1 maxStudents means unlimited — skip seat limit check
    if (isNew && latestSub && latestSub.maxStudents !== -1) {
      const activeSeats = await getCentreActiveSeats(centreId, tx);
      if (activeSeats >= latestSub.maxStudents) return { ok: false as const };
    }
    await grantCentreSeat(centreId, params.userId, tx);
    return { ok: true as const };
  });

  if (!result.ok) {
    return NextResponse.json({ success: false, error: `Seat limit reached (${latestSub!.maxStudents}). Upgrade your plan to add more students.` }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: { message: `${student.name}'s access renewed for 1 month (30 days).` } });
}
