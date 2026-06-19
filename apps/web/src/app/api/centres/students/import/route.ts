import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sendEmail, centreInvitationEmailTemplate } from "@/lib/email";
import { grantCentreSeat, getCentreActiveSeats } from "@/lib/centre-access";

export const dynamic = "force-dynamic";

interface ImportRow {
  name: string;
  email: string;
  phone?: string;
}

// POST /api/centres/students/import
// Bulk-import students from a pre-parsed CSV payload (max 100 rows).
// For each row: same logic as /invite-student — links existing accounts, invites new ones.
// Returns { imported, invited, skipped, errors }.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!["CENTRE_ADMIN", "SUPER_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const centreId = user!.centreId;
  if (!centreId) {
    return NextResponse.json({ success: false, error: "Not associated with a centre" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const rows: ImportRow[] = body?.students;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ success: false, error: "No student rows provided" }, { status: 400 });
  }
  if (rows.length > 100) {
    return NextResponse.json({ success: false, error: "Maximum 100 students per import" }, { status: 400 });
  }

  const [centre, latestSub] = await Promise.all([
    db.centre.findUnique({ where: { id: centreId } }),
    db.centreSubscription.findFirst({
      where: { centreId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!centre) {
    return NextResponse.json({ success: false, error: "Centre not found" }, { status: 404 });
  }

  let imported = 0;
  let invited = 0;
  let skipped = 0;
  const errors: { email: string; reason: string }[] = [];

  for (const row of rows) {
    const email = (row.email || "").toLowerCase().trim();
    const name = (row.name || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ email: email || "(blank)", reason: "Invalid email" });
      continue;
    }
    if (!name) {
      errors.push({ email, reason: "Name is required" });
      continue;
    }

    // Seat limit check (skip if unlimited)
    if (latestSub && latestSub.maxStudents !== -1) {
      const activeSeats = await getCentreActiveSeats(centreId);
      if (activeSeats >= latestSub.maxStudents) {
        errors.push({ email, reason: "Seat limit reached" });
        skipped++;
        continue;
      }
    }

    try {
      const existingUser = await db.user.findUnique({ where: { email } });

      if (existingUser) {
        if (existingUser.centreId && existingUser.centreId !== centreId) {
          errors.push({ email, reason: "Belongs to another centre" });
          skipped++;
          continue;
        }

        const existingSeat = existingUser.centreId === centreId
          ? await db.centreStudentSeat.findUnique({
              where: { centreId_userId: { centreId, userId: existingUser.id } },
            })
          : null;

        if (existingSeat?.status === "ACTIVE" && existingSeat.endDate > new Date()) {
          errors.push({ email, reason: "Already has an active seat" });
          skipped++;
          continue;
        }

        await db.user.update({ where: { id: existingUser.id }, data: { centreId } });
        await grantCentreSeat(centreId, existingUser.id);
        sendEmail({
          to: email,
          subject: `You've been added to ${centre.name} on Prepfly`,
          html: centreInvitationEmailTemplate({
            centreName: centre.name,
            adminName: user!.name || "Your Centre Admin",
            registerUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
          }),
        }).catch(() => {});
        imported++;
      } else {
        const existingInvite = await db.centreInvitation.findFirst({
          where: { email, centreId, status: "PENDING" },
        });
        if (existingInvite) {
          errors.push({ email, reason: "Invitation already pending" });
          skipped++;
          continue;
        }

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await db.centreInvitation.create({ data: { centreId, email, expiresAt } });

        const registerUrl = `${process.env.NEXTAUTH_URL}/register?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
        sendEmail({
          to: email,
          subject: `${centre.name} has invited you to Prepfly`,
          html: centreInvitationEmailTemplate({
            centreName: centre.name,
            adminName: user!.name || "Your Centre Admin",
            registerUrl,
          }),
        }).catch(() => {});
        invited++;
      }
    } catch {
      errors.push({ email, reason: "Unexpected error — try again" });
    }
  }

  return NextResponse.json({
    success: true,
    data: { imported, invited, skipped, errors },
  });
}
