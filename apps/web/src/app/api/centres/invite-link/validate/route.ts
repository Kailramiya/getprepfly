import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/centres/invite-link/validate?token=...
// Public — lets the (logged-out) register page show "Join <centre>" and detect
// expired/used links. Only returns the centre name; never anything sensitive.
export async function GET(req: NextRequest) {
  const limited = await enforceRateLimit("auth", clientIp(req));
  if (limited) return limited;

  const token = new URL(req.url).searchParams.get("token") || "";
  if (!token) {
    return NextResponse.json({ success: true, data: { valid: false } });
  }

  const link = await db.centreInviteLink.findUnique({
    where: { token },
    include: { centre: { select: { name: true } } },
  });

  const valid = !!link && !link.usedAt && link.expiresAt > new Date();
  return NextResponse.json({
    success: true,
    data: { valid, centreName: valid ? link!.centre.name : null },
  });
}
