import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { getUserAccess } from "@/lib/access";

// GET /api/access/me — returns current user's module access
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const access = await getUserAccess(user!.id);

  return NextResponse.json({
    success: true,
    data: {
      hasAllAccess: access.hasAllAccess,
      modules: Array.from(access.modules),
      expiresAt: access.expiresAt,
      centreId: user!.centreId || null,
    },
  });
}
