import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

async function ownBatch(batchId: string, centreId: string | undefined | null) {
  if (!centreId) return null;
  return db.batch.findFirst({ where: { id: batchId, centreId }, select: { id: true } });
}

// PATCH /api/centres/batches/[batchId] — rename a batch
export async function PATCH(req: NextRequest, { params }: { params: { batchId: string } }) {
  const { user, error } = await requireRole(["CENTRE_ADMIN"]);
  if (error) return error;

  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim() || name.length > 80) {
    return NextResponse.json({ success: false, error: "A batch name (max 80 chars) is required" }, { status: 400 });
  }
  if (!(await ownBatch(params.batchId, user!.centreId))) {
    return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
  }
  const batch = await db.batch.update({ where: { id: params.batchId }, data: { name: name.trim() } });
  return NextResponse.json({ success: true, data: batch });
}

// DELETE /api/centres/batches/[batchId] — delete a batch (students stay in the centre)
export async function DELETE(_req: NextRequest, { params }: { params: { batchId: string } }) {
  const { user, error } = await requireRole(["CENTRE_ADMIN"]);
  if (error) return error;

  if (!(await ownBatch(params.batchId, user!.centreId))) {
    return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
  }
  // The batch's assigned tests are templates; left behind they'd lose assignedBatchId and
  // show up as global templates for everyone. Students' own copies are kept (FK -> null).
  await db.$transaction([
    db.mockTest.deleteMany({ where: { assignedBatchId: params.batchId, isTemplate: true } }),
    db.batch.delete({ where: { id: params.batchId } }),
  ]);
  return NextResponse.json({ success: true });
}
