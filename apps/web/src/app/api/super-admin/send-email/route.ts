import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// POST /api/super-admin/send-email
// audience: "all" | "centres" | "students" | "specific"
// specificEmail: used when audience = "specific"
export async function POST(req: NextRequest) {
  const { error } = await requireRole(["SUPER_ADMIN"]);
  if (error) return error;

  const { subject, body, audience, specificEmail } = await req.json();

  if (!subject?.trim() || !body?.trim() || !audience) {
    return NextResponse.json({ success: false, error: "subject, body and audience are required" }, { status: 400 });
  }

  // Build recipient list
  let recipients: string[] = [];

  if (audience === "specific") {
    if (!specificEmail?.trim()) return NextResponse.json({ success: false, error: "Email required" }, { status: 400 });
    recipients = [specificEmail.trim()];
  } else {
    const where: any =
      audience === "centres" ? { role: "CENTRE_ADMIN" } :
      audience === "students" ? { role: "STUDENT" } :
      {}; // "all"

    const users = await db.user.findMany({ where, select: { email: true } });
    recipients = users.map(u => u.email);
  }

  if (recipients.length === 0) {
    return NextResponse.json({ success: false, error: "No recipients found" }, { status: 400 });
  }

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:20px">
      <div style="background:linear-gradient(135deg,#14B8A6,#4F46E5);padding:24px;border-radius:12px 12px 0 0;text-align:center">
        <h1 style="color:white;margin:0;font-size:22px;font-weight:700">Prepfly</h1>
        <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px">PTE Academic Practice Platform</p>
      </div>
      <div style="border:1px solid #E5E7EB;border-top:none;padding:32px 24px;border-radius:0 0 12px 12px;background:#fff">
        <div style="font-size:15px;color:#374151;line-height:1.7;white-space:pre-wrap">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        <div style="border-top:1px solid #E5E7EB;margin-top:28px;padding-top:16px">
          <p style="margin:0;color:#9CA3AF;font-size:12px">You are receiving this because you have an account on Prepfly.</p>
        </div>
      </div>
    </div>
  `;

  // Send in batches of 10 to avoid SMTP rate limits
  let sent = 0;
  let failed = 0;
  const BATCH = 10;

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await Promise.all(
      batch.map(to =>
        sendEmail({ to, subject, html })
          .then(ok => { if (ok) sent++; else failed++; })
          .catch(() => { failed++; })
      )
    );
    // Small delay between batches to respect SMTP limits
    if (i + BATCH < recipients.length) await new Promise(r => setTimeout(r, 500));
  }

  return NextResponse.json({ success: true, data: { sent, failed, total: recipients.length } });
}
