import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// GET /api/centres/:centreId/students — list students of a centre
export async function GET(
  req: NextRequest,
  { params }: { params: { centreId: string } }
) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  if (user!.role !== "SUPER_ADMIN" && user!.centreId !== params.centreId) {
    return NextResponse.json(
      { success: false, error: "Access denied" },
      { status: 403 }
    );
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
  const search = url.searchParams.get("search") || "";
  const batchId = url.searchParams.get("batchId");

  const where: any = {
    centreId: params.centreId,
    role: "STUDENT",
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(batchId && {
      batchMemberships: { some: { batchId } },
    }),
  };

  const [students, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        studentPlan: { select: { planType: true, status: true } },
        batchMemberships: {
          include: { batch: { select: { id: true, name: true } } },
        },
        _count: { select: { attempts: true, mockTests: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    db.user.count({ where }),
  ]);

  // Fetch seat info separately — table may not exist if migration hasn't run
  const seatMap: Record<string, { status: string; startDate: Date; endDate: Date } | null> = {};
  try {
    const seats = await (db as any).centreStudentSeat?.findMany({
      where: { centreId: params.centreId, userId: { in: students.map((s: any) => s.id) } },
      select: { userId: true, status: true, startDate: true, endDate: true },
    });
    if (seats) {
      seats.forEach((s: any) => { seatMap[s.userId] = s; });
    }
  } catch { /* table not yet migrated */ }

  return NextResponse.json({
    success: true,
    data: {
      items: students.map((s: any) => ({ ...s, centreSeats: seatMap[s.id] ? [seatMap[s.id]] : [] })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
