import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { getCentreActiveSeats } from "@/lib/centre-access";

const LINK_TTL_MS = 60 * 60 * 1000; // 1 hour

// POST /api/centres/invite-link
// Centre admin generates a single-use join link to copy & send to one student.
// Consumed by the first student who registers via it; expires after 1 hour.
export async function POST(_req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!["CENTRE_ADMIN", "TEACHER", "SUPER_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const centreId = user!.centreId;
  if (!centreId) {
    return NextResponse.json({ success: false, error: "You are not associated with a centre" }, { status: 400 });
  }

  // Enforce seat limit (same rule as email invites; -1 = unlimited).
  const latestSub = await db.centreSubscription.findFirst({
    where: { centreId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });
  if (latestSub && latestSub.maxStudents !== -1) {
    const activeSeats = await getCentreActiveSeats(centreId);
    if (activeSeats >= latestSub.maxStudents) {
      return NextResponse.json(
        {
          success: false,
          error: `Seat limit reached. Your ${latestSub.planName} allows ${latestSub.maxStudents} students. Upgrade to add more.`,
        },
        { status: 403 }
      );
    }
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + LINK_TTL_MS);

  await db.centreInviteLink.create({
    data: { centreId, token, createdById: user!.id, expiresAt },
  });

  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  const url = `${base}/register?invite=${token}`;

  return NextResponse.json({ success: true, data: { url, token, expiresAt } });
}
