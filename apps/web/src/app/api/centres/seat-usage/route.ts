import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/centres/seat-usage — seat stats for the current admin's centre
export async function GET() {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  const centreId = user!.centreId;
  if (!centreId) return NextResponse.json({ success: false, error: "No centre" }, { status: 400 });

  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const in30 = new Date(now.getTime() + 30 * 86400000);

  // Get active subscription to know the seat cap
  const sub = await db.centreSubscription.findFirst({
    where: { centreId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { maxStudents: true, planName: true, endDate: true },
  });

  const seats = await db.centreStudentSeat.findMany({
    where: { centreId, status: "ACTIVE", endDate: { gte: now } },
    select: { endDate: true },
  });
  const used = seats.length;
  const expiring7  = seats.filter(s => s.endDate <= in7).length;
  const expiring30 = seats.filter(s => s.endDate <= in30).length;

  return NextResponse.json({
    success: true,
    data: {
      used,
      total: sub?.maxStudents ?? 50,
      expiring7,
      expiring30,
      planName: sub?.planName ?? null,
      subscriptionEndDate: sub?.endDate ?? null,
    },
  });
}
