import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const body = await req.json();

  if (body.maxUses !== undefined && !Number.isFinite(Number(body.maxUses))) {
    return NextResponse.json({ success: false, error: "maxUses must be a number" }, { status: 400 });
  }
  let validUntilDate: Date | undefined;
  if (body.validUntil !== undefined) {
    validUntilDate = new Date(body.validUntil);
    if (isNaN(validUntilDate.getTime())) {
      return NextResponse.json({ success: false, error: "validUntil must be a valid date" }, { status: 400 });
    }
  }

  const coupon = await db.coupon.update({
    where: { id: params.id },
    data: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.maxUses !== undefined && { maxUses: Number(body.maxUses) }),
      ...(validUntilDate !== undefined && { validUntil: validUntilDate }),
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
