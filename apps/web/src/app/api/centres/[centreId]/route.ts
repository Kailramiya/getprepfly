import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// GET /api/centres/:centreId — get centre details
export async function GET(
  req: NextRequest,
  { params }: { params: { centreId: string } }
) {
  const centre = await db.centre.findUnique({
    where: { id: params.centreId },
    include: {
      _count: { select: { users: true, batches: true, questions: true } },
      batches: {
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!centre) {
    return NextResponse.json(
      { success: false, error: "Centre not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: centre });
}

// PATCH /api/centres/:centreId — update centre details
export async function PATCH(
  req: NextRequest,
  { params }: { params: { centreId: string } }
) {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  // Centre admin can only update their own centre
  if (user!.role === "CENTRE_ADMIN" && user!.centreId !== params.centreId) {
    return NextResponse.json(
      { success: false, error: "You can only edit your own centre" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, logo, primaryColor, address, city, state, phone, email, website } = body;

  const centre = await db.centre.update({
    where: { id: params.centreId },
    data: {
      ...(name && { name }),
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

  return NextResponse.json({ success: true, data: centre });
}
