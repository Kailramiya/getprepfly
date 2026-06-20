import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { getUserAccess } from "@/lib/access";
import { db } from "@/lib/db";

/**
 * GET /api/mock-tests/init
 * Batches 3 previously-separate calls into one round trip:
 *   - /api/mock-tests/assigned
 *   - /api/mock-tests/global-templates
 *   - /api/access/me
 * The mock-test list page uses this to cut from 4 → 2 fetches on mount.
 */
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const [memberships, templates, access] = await Promise.all([
    db.batchMember.findMany({
      where: { userId: user!.id },
      select: { batchId: true },
    }),
    db.mockTest.findMany({
      where: { isTemplate: true, assignedBatchId: null },
      select: {
        id: true, title: true, mockType: true, section: true,
        isFree: true, createdAt: true,
        _count: { select: { questions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    getUserAccess(user!.id),
  ]);

  const batchIds = memberships.map(m => m.batchId);
  const assigned = batchIds.length > 0
    ? await db.mockTest.findMany({
        where: { assignedBatchId: { in: batchIds }, isTemplate: true },
        select: { id: true, title: true, createdAt: true, assignedBatchId: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  const res = NextResponse.json({
    success: true,
    data: {
      assigned,
      templates,
      access: {
        hasAllAccess: access.hasAllAccess,
        modules: Array.from(access.modules),
        expiresAt: access.expiresAt,
        centreId: user!.centreId || null,
        role: user!.role,
        isStaff: ["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"].includes(user!.role),
        isTrial: access.isTrial,
        trialEndsAt: access.trialEndsAt,
        trialExpired: access.trialExpired,
        canPracticeSpeaking: access.canPracticeSpeaking,
        freeSpeakingScoringsRemaining: isFinite(access.freeSpeakingScoringsRemaining)
          ? access.freeSpeakingScoringsRemaining
          : null,
      },
    },
  });

  res.headers.set("Cache-Control", "private, max-age=60");
  return res;
}
