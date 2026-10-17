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

  // Only students actually in this centre may be seeded into the new batch —
  // without this, a client-supplied studentIds array could add another
  // centre's students, same cross-tenant leak the members route already guards against.
  let memberIds: string[] = [];
  if (studentIds?.length) {
    const ids = studentIds.filter((id: unknown): id is string => typeof id === "string");
    const inCentre = await db.user.findMany({
      where: { id: { in: ids }, centreId: params.centreId },
      select: { id: true },
    });
    memberIds = inCentre.map((u) => u.id);
  }

  const batch = await db.batch.create({
    data: {
      name: name.trim(),
      centreId: params.centreId,
      ...(memberIds.length && {
        members: {
          create: memberIds.map((userId) => ({ userId })),
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
