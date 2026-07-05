import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// POST /api/centres/batches/[batchId]/assign-test
// Admin creates a mock test template and assigns it to a batch.
// All students in the batch can then start their own copy of this test.
export async function POST(req: NextRequest, { params }: { params: { batchId: string } }) {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const { title, templateId } = await req.json();

  if (!templateId) {
    return NextResponse.json({ success: false, error: "templateId is required" }, { status: 400 });
  }

  // Verify batch belongs to admin's centre
  const batch = await db.batch.findFirst({
    where: { id: params.batchId, centreId: user!.centreId! },
    include: { members: { include: { user: { select: { id: true } } } } },
  });
  if (!batch) return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });

  // Fetch the global template to clone its questions
  const globalTemplate = await db.mockTest.findUnique({
    where: { id: templateId, isTemplate: true },
    include: { questions: true }
  });

  if (!globalTemplate) {
    return NextResponse.json({ success: false, error: "Global template not found" }, { status: 404 });
  }

  // Create template mock test (no userId — it's a batch assignment)
  const template = await db.mockTest.create({
    data: {
      userId: user!.id, // created by admin
      title: title || `${batch.name} — ${globalTemplate.title}`,
      isTemplate: true,
      assignedBatchId: params.batchId,
      mockType: globalTemplate.mockType,
      section: globalTemplate.section,
      questions: {
        create: globalTemplate.questions.map(q => ({
          questionId: q.questionId,
          order: q.order
        }))
      }
    },
  });

  return NextResponse.json({ success: true, data: { templateId: template.id, batchSize: batch.members.length } });
}

// GET — list assigned tests for a batch
export async function GET(_req: NextRequest, { params }: { params: { batchId: string } }) {
  const { error } = await requireRole(["CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const tests = await db.mockTest.findMany({
    where: { assignedBatchId: params.batchId, isTemplate: true },
    include: { _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: tests });
}
