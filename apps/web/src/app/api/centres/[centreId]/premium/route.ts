import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// PATCH /api/centres/:centreId/premium — toggle premium centre status (super admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { centreId: string } }
) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const { isPremiumCentre, premiumUntil } = body;

  const centre = await db.centre.findUnique({
    where: { id: params.centreId },
  });

  if (!centre) {
    return NextResponse.json(
      { success: false, error: "Centre not found" },
      { status: 404 }
    );
  }

  const updated = await db.centre.update({
    where: { id: params.centreId },
    data: {
      ...(typeof isPremiumCentre === "boolean" && { isPremiumCentre }),
      ...(premiumUntil !== undefined && {
        premiumUntil: premiumUntil ? new Date(premiumUntil) : null,
      }),
    },
    select: {
      id: true,
      name: true,
      isPremiumCentre: true,
      premiumUntil: true,
    },
  });

  return NextResponse.json({
    success: true,
    data: updated,
    message: updated.isPremiumCentre
      ? `${updated.name} is now a PREMIUM centre. All their students get full access.`
      : `${updated.name} is no longer a premium centre.`,
  });
}
