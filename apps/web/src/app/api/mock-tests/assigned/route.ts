import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/mock-tests/assigned — tests assigned to the student's batch
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  // Find which batches the student is in
  const memberships = await db.batchMember.findMany({
    where: { userId: user!.id },
    select: { batchId: true },
  });
  const batchIds = memberships.map(m => m.batchId);
  if (batchIds.length === 0) return NextResponse.json({ success: true, data: [] });

  const assigned = await db.mockTest.findMany({
    where: { assignedBatchId: { in: batchIds }, isTemplate: true },
    select: { id: true, title: true, createdAt: true, assignedBatchId: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: assigned });
}
