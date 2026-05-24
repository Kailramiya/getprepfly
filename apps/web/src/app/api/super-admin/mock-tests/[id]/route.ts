import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// GET /api/super-admin/mock-tests/[id] — template with full question details
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const template = await db.mockTest.findUnique({
    where: { id: params.id, isTemplate: true },
    include: {
      questions: {
        include: {
          question: {
            select: {
              id: true, section: true, type: true, title: true,
              difficulty: true, mockTestOnly: true, audioUrl: true, imageUrl: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ success: false, error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: template });
}
