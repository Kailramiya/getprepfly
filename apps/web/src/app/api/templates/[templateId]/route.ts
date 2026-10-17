import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// PATCH /api/templates/:templateId — update template
// Template has no centreId or creator field — it's a single shared pool any
// centre admin/teacher can contribute to (see POST). Without ownership
// tracking there's no way to let someone edit only "their own" template, so
// mutation is restricted to SUPER_ADMIN, same as Vocabulary's DELETE — any
// centre admin could otherwise silently rewrite another centre's submission.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
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

// DELETE /api/templates/:templateId — delete template (hard delete — same
// shared-pool reasoning as PATCH above, SUPER_ADMIN only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  await db.template.delete({ where: { id: params.templateId } });

  return NextResponse.json({ success: true, message: "Template deleted" });
}
