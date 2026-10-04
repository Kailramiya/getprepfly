import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// POST /api/centres/batches/[batchId]/members
// Add multiple students to an existing batch
export async function POST(req: NextRequest, { params }: { params: { batchId: string } }) {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  try {
    const { studentIds } = await req.json();

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ success: false, error: "studentIds array is required" }, { status: 400 });
    }

    // Verify batch belongs to admin's centre
    const batch = await db.batch.findFirst({
      where: { id: params.batchId, centreId: user!.centreId! },
    });
    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    // Only users in the same centre may be added (blocks cross-tenant ids)
    const ids = studentIds.filter((id): id is string => typeof id === "string");
    const inCentre = await db.user.findMany({
      where: { id: { in: ids }, centreId: user!.centreId! },
      select: { id: true },
    });

    // Insert batch members, skipping if they already exist
    const result = await db.batchMember.createMany({
      data: inCentre.map(({ id: userId }) => ({
        batchId: params.batchId,
        userId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ success: true, data: { added: result.count } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// DELETE /api/centres/batches/[batchId]/members — remove students from a batch
// (they stay in the centre; only the batch membership goes)
export async function DELETE(req: NextRequest, { params }: { params: { batchId: string } }) {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const { studentIds } = await req.json().catch(() => ({}));
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return NextResponse.json({ success: false, error: "studentIds array is required" }, { status: 400 });
  }
  const batch = await db.batch.findFirst({
    where: { id: params.batchId, centreId: user!.centreId! },
    select: { id: true },
  });
  if (!batch) {
    return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
  }
  const result = await db.batchMember.deleteMany({
    where: { batchId: params.batchId, userId: { in: studentIds.filter((id): id is string => typeof id === "string") } },
  });
  return NextResponse.json({ success: true, data: { removed: result.count } });
}
