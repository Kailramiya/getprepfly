import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

// GET /api/centres/batches/[batchId]/progress
// Returns per-student mock-test completion status for a batch.
export async function GET(
  _req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const batch = await db.batch.findFirst({
    where: { id: params.batchId, centreId: user!.centreId! },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true, name: true, email: true,
              _count: { select: { attempts: true } },
            },
          },
        },
      },
    },
  });

  if (!batch) {
    return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
  }

  // Assigned mock-test templates for this batch
  const templates = await db.mockTest.findMany({
    where: { assignedBatchId: params.batchId, isTemplate: true },
    select: { id: true, title: true, createdAt: true, _count: { select: { questions: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Student mock-test completions linked to this batch
  const memberIds = batch.members.map(m => m.user.id);
  const studentTests = await db.mockTest.findMany({
    where: {
      userId: { in: memberIds },
      assignedBatchId: params.batchId,
      isTemplate: false,
    },
    select: {
      id: true, userId: true, status: true, overallScore: true,
      startedAt: true, completedAt: true,
    },
  });

  // Build per-student summary
  const studentSummary = batch.members.map(m => {
    const tests = studentTests.filter(t => t.userId === m.user.id);
    const completed = tests.filter(t => t.status === "COMPLETED");
    const inProgress = tests.filter(t => t.status === "IN_PROGRESS");
    const avgScore = completed.length > 0
      ? Math.round(completed.reduce((a, t) => a + (t.overallScore ?? 0), 0) / completed.length)
      : null;

    return {
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      totalAttempts: m.user._count.attempts,
      testsStarted: tests.length,
      testsCompleted: completed.length,
      testsInProgress: inProgress.length,
      avgScore,
      lastTestAt: completed[0]?.completedAt ?? inProgress[0]?.startedAt ?? null,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      batch: { id: batch.id, name: batch.name, memberCount: batch.members.length },
      templates,
      students: studentSummary.sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1)),
      summary: {
        totalMembers: batch.members.length,
        startedAny: studentSummary.filter(s => s.testsStarted > 0).length,
        completedAny: studentSummary.filter(s => s.testsCompleted > 0).length,
      },
    },
  });
}
