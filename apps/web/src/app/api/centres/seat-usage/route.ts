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

  let used = 0, expiring7 = 0, expiring30 = 0;
  try {
    const seats = await (db as any).centreStudentSeat?.findMany({
      where: { centreId, status: "ACTIVE", endDate: { gte: now } },
      select: { endDate: true },
    });
    if (seats) {
      used = seats.length;
      expiring7  = seats.filter((s: any) => s.endDate <= in7).length;
      expiring30 = seats.filter((s: any) => s.endDate <= in30).length;
    }
  } catch { /* seat table not yet migrated */ }

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
