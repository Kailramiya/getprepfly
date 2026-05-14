import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/centres/subscription — current centre plan status + billing history
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const centreId = user!.centreId;
  if (!centreId) {
    return NextResponse.json({ success: true, data: { plan: null, centre: null, history: [] } });
  }

  const [centre, latestSub, history, studentCount] = await Promise.all([
    db.centre.findUnique({
      where: { id: centreId },
      select: { name: true, isPremiumCentre: true, premiumUntil: true },
    }),
    db.centreSubscription.findFirst({
      where: { centreId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    }),
    db.centreSubscription.findMany({
      where: { centreId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { payments: { select: { amount: true, razorpayPaymentId: true, createdAt: true } } },
    }),
    db.user.count({ where: { centreId, role: "STUDENT" } }),
  ]);

  const now = new Date();
  const isActive = centre?.isPremiumCentre && centre.premiumUntil && centre.premiumUntil > now;
  const daysLeft = isActive && centre?.premiumUntil
    ? Math.ceil((centre.premiumUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return NextResponse.json({
    success: true,
    data: {
      centre: {
        name: centre?.name,
        isPremiumCentre: centre?.isPremiumCentre,
        premiumUntil: centre?.premiumUntil?.toISOString() || null,
        isActive,
        daysLeft,
        studentCount,
      },
      plan: latestSub ? {
        id: latestSub.id,
        planName: latestSub.planName,
        maxStudents: latestSub.maxStudents,
        monthlyPrice: latestSub.monthlyPrice,
        status: latestSub.status,
        startDate: latestSub.startDate.toISOString(),
        endDate: latestSub.endDate?.toISOString() || null,
      } : null,
      history: history.map((s) => ({
        id: s.id,
        planName: s.planName,
        monthlyPrice: s.monthlyPrice,
        status: s.status,
        startDate: s.startDate.toISOString(),
        endDate: s.endDate?.toISOString() || null,
        payment: s.payments[0] ? {
          amount: s.payments[0].amount,
          razorpayPaymentId: s.payments[0].razorpayPaymentId,
          createdAt: s.payments[0].createdAt.toISOString(),
        } : null,
      })),
    },
  });
}
