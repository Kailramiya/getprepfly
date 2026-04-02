import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// PATCH /api/centres/branding — update centre branding (centre admin only)
export async function PATCH(req: NextRequest) {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  if (!user!.centreId && user!.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "No centre associated with your account" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { name, logo, primaryColor, address, city, state, phone, email, website, centreId } = body;

  const targetCentreId = user!.role === "SUPER_ADMIN" && centreId ? centreId : user!.centreId;

  if (!targetCentreId) {
    return NextResponse.json(
      { success: false, error: "Centre ID not found" },
      { status: 400 }
    );
  }

  const updated = await db.centre.update({
    where: { id: targetCentreId },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(logo !== undefined && { logo }),
      ...(primaryColor && { primaryColor }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(website !== undefined && { website }),
    },
  });

  return NextResponse.json({ success: true, data: updated, message: "Centre branding updated" });
}
