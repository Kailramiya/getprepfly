import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// PATCH /api/templates/:templateId — update template
export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN", "TEACHER"]);
  if (error) return error;

  const body = await req.json();
  const { title, questionType, content, language, isPremium } = body;

  const updated = await db.template.update({
    where: { id: params.templateId },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(questionType !== undefined && { questionType }),
      ...(content !== undefined && { content: content.trim() }),
      ...(language !== undefined && { language }),
      ...(isPremium !== undefined && { isPremium }),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/templates/:templateId — delete template
export async function DELETE(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const { error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  await db.template.delete({ where: { id: params.templateId } });

  return NextResponse.json({ success: true, message: "Template deleted" });
}
