import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await req.json();
  const coupon = await db.coupon.update({
    where: { id: params.id },
    data: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.maxUses !== undefined && { maxUses: Number(body.maxUses) }),
      ...(body.validUntil !== undefined && { validUntil: new Date(body.validUntil) }),
    },
  });
  return NextResponse.json({ success: true, data: coupon });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  await db.coupon.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
