import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// GET /api/centres/:centreId/batches
export async function GET(
  req: NextRequest,
  { params }: { params: { centreId: string } }
) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  if (user!.role !== "SUPER_ADMIN" && user!.centreId !== params.centreId) {
    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  }

  const batches = await db.batch.findMany({
    where: { centreId: params.centreId },
    include: {
      _count: { select: { members: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: batches });
}

// POST /api/centres/:centreId/batches — create new batch
export async function POST(
  req: NextRequest,
  { params }: { params: { centreId: string } }
) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  if (user!.role !== "SUPER_ADMIN" && user!.centreId !== params.centreId) {
    return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
  }

  const body = await req.json();
  const { name, studentIds } = body;

  if (!name) {
    return NextResponse.json({ success: false, error: "Batch name is required" }, { status: 400 });
  }

  const batch = await db.batch.create({
    data: {
      name: name.trim(),
      centreId: params.centreId,
      ...(studentIds?.length && {
        members: {
          create: studentIds.map((userId: string) => ({ userId })),
        },
      }),
    },
    include: { _count: { select: { members: true } } },
  });

  return NextResponse.json(
    { success: true, data: batch, message: "Batch created" },
    { status: 201 }
  );
}
