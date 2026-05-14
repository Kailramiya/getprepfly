import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sendEmail, centreInvitationEmailTemplate } from "@/lib/email";
import { grantCentreSeat, getCentreActiveSeats } from "@/lib/centre-access";

// POST /api/centres/invite-student
// Centre admin invites a student by email.
// If the student already has an account → links them directly.
// If not → creates a pending invitation + sends registration email.
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  if (!["CENTRE_ADMIN", "TEACHER", "SUPER_ADMIN"].includes(user!.role)) {
    return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 });
  }

  const centreId = user!.centreId;
  if (!centreId) {
    return NextResponse.json({ success: false, error: "You are not associated with a centre" }, { status: 400 });
  }

  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

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

  // Enforce seat limit based on active plan
  if (latestSub) {
    const activeSeats = await getCentreActiveSeats(centreId);
    if (activeSeats >= latestSub.maxStudents) {
      return NextResponse.json({
        success: false,
        error: `Seat limit reached. Your ${latestSub.planName} allows ${latestSub.maxStudents} students. Upgrade to add more.`,
      }, { status: 403 });
    }
  }

  // Case 1: Student already has an account → link directly + grant seat
  const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    if (existingUser.centreId === centreId) {
      // Already in centre — check if they have an active seat; if not, grant one
      const existingSeat = await db.centreStudentSeat.findUnique({
        where: { centreId_userId: { centreId, userId: existingUser.id } },
      });
      if (existingSeat?.status === "ACTIVE" && existingSeat.endDate > new Date()) {
        return NextResponse.json({ success: false, error: "This student already has an active seat in your centre" }, { status: 409 });
      }
    } else if (existingUser.centreId && existingUser.centreId !== centreId) {
      return NextResponse.json({ success: false, error: "This student is already associated with another centre" }, { status: 409 });
    }

    // Link to centre + grant 90-day seat
    await db.user.update({ where: { id: existingUser.id }, data: { centreId } });
    await grantCentreSeat(centreId, existingUser.id);

    await sendEmail({
      to: normalizedEmail,
      subject: `You've been added to ${centre.name} on Prepfly`,
      html: centreInvitationEmailTemplate({
        centreName: centre.name,
        adminName: user!.name || "Your Centre Admin",
        registerUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
      }),
    });
    return NextResponse.json({
      success: true,
      data: { status: "linked", message: `${existingUser.name} has been added with 90 days of access.` },
    });
  }

  // Case 2: No account yet → check for duplicate pending invitation
  const existingInvite = await db.centreInvitation.findFirst({
    where: { email: normalizedEmail, centreId, status: "PENDING" },
  });
  if (existingInvite) {
    return NextResponse.json({ success: false, error: "An invitation has already been sent to this email" }, { status: 409 });
  }

  // Create invitation (expires in 7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.centreInvitation.create({
    data: { centreId, email: normalizedEmail, expiresAt },
  });

  const registerUrl = `${process.env.NEXTAUTH_URL}/register?email=${encodeURIComponent(normalizedEmail)}`;

  await sendEmail({
    to: normalizedEmail,
    subject: `${centre.name} has invited you to Prepfly`,
    html: centreInvitationEmailTemplate({
      centreName: centre.name,
      adminName: user!.name || "Your Centre Admin",
      registerUrl,
    }),
  });

  return NextResponse.json({
    success: true,
    data: { status: "invited", message: `Invitation sent to ${normalizedEmail}` },
  });
}

// GET /api/centres/invite-student — list pending invitations for the centre
export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  const centreId = user!.centreId;
  if (!centreId) {
    return NextResponse.json({ success: true, data: [] });
  }

  const invitations = await db.centreInvitation.findMany({
    where: { centreId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: invitations });
}
