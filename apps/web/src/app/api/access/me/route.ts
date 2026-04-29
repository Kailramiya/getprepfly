import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { getUserAccess } from "@/lib/access";

// GET /api/access/me — returns current user's module access
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const access = await getUserAccess(user!.id);

  const res = NextResponse.json({
    success: true,
    data: {
      hasAllAccess: access.hasAllAccess,
      modules: Array.from(access.modules),
      expiresAt: access.expiresAt,
      centreId: user!.centreId || null,
      role: user!.role,
      isStaff: user!.role === "SUPER_ADMIN",
      isTrial: access.isTrial,
      trialEndsAt: access.trialEndsAt,
      trialExpired: access.trialExpired,
      canPracticeSpeaking: access.canPracticeSpeaking,
      freeSpeakingScoringsUsedToday: access.freeSpeakingScoringsUsedToday,
      freeSpeakingScoringsRemaining: isFinite(access.freeSpeakingScoringsRemaining)
        ? access.freeSpeakingScoringsRemaining
        : null, // null = unlimited
      reason: access.reason,
    },
  });

  // Cache for 60s on the client to reduce repeat calls
  res.headers.set("Cache-Control", "private, max-age=60");
  return res;
}
