import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/mock-tests/global-templates — templates created by super admin, visible to all students
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const templates = await db.mockTest.findMany({
    where: { isTemplate: true, assignedBatchId: null },
    select: {
      id: true,
      title: true,
      mockType: true,
      section: true,
      isFree: true,
      createdAt: true,
      _count: { select: { questions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: templates });
}
