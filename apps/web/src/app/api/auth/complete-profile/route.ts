import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { grantCentreSeat, getCentreActiveSeats } from "@/lib/centre-access";
import { getCurrentUser } from "@/lib/auth-utils";

const CompleteProfileSchema = z.object({
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, ""))
    .refine((v) => /^\+?\d{10,15}$/.test(v), "Enter a valid phone number (10–15 digits)"),
  role: z.string().optional(),
  centreName: z.string().trim().max(120).optional(),
  centreReferralCode: z.string().trim().max(60).optional(),
  inviteToken: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CompleteProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { phone, role, centreName, centreReferralCode, inviteToken } = parsed.data;
    const isCentre = role === "centre" && !inviteToken;

    // Check phone uniqueness
    const existingPhone = await db.user.findUnique({ where: { phone } });
    if (existingPhone && existingPhone.id !== user.id) {
      return NextResponse.json({ success: false, error: "This phone number is already registered" }, { status: 409 });
    }

    let referralSlug: string | undefined;
    if (isCentre) {
      if (!centreName?.trim() || !centreReferralCode?.trim()) {
        return NextResponse.json({ success: false, error: "Centre name and referral code are required" }, { status: 400 });
      }
      
      const existingCentreName = await db.centre.findFirst({
        where: { name: { equals: centreName.trim(), mode: "insensitive" } },
      });
      if (existingCentreName) {
        return NextResponse.json({ success: false, error: "A centre with this name already exists." }, { status: 409 });
      }

      referralSlug = centreReferralCode
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const existingSlug = await db.centre.findUnique({ where: { slug: referralSlug } });
      if (existingSlug) {
        return NextResponse.json({ success: false, error: "This referral code is already taken." }, { status: 409 });
      }
    }

    let centreId: string | undefined;
    let inviteLinkId: string | undefined;

    // Process Invite Token
    if (inviteToken && !isCentre) {
      const link = await db.centreInviteLink.findUnique({ where: { token: inviteToken } });
      if (!link || link.usedAt || link.expiresAt < new Date()) {
        return NextResponse.json({ success: false, error: "Invite link invalid or expired." }, { status: 400 });
      }
      const sub = await db.centreSubscription.findFirst({
        where: { centreId: link.centreId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
      });
      if (sub && sub.maxStudents !== -1 && (await getCentreActiveSeats(link.centreId)) >= sub.maxStudents) {
        return NextResponse.json({ success: false, error: "Centre reached its student limit." }, { status: 403 });
      }
      centreId = link.centreId;
      inviteLinkId = link.id;
    }

    // Process Email Invitation
    if (!centreId && !isCentre) {
      const invitation = await db.centreInvitation.findFirst({
        where: { email: user.email!, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });
      if (invitation && invitation.expiresAt > new Date()) {
        centreId = invitation.centreId;
      }
    }

    const isInvited = !!centreId && !isCentre;

    await db.$transaction(async (tx) => {
      let newCentreId = centreId;

      if (isCentre) {
        const newCentre = await tx.centre.create({
          data: {
            name: centreName!.trim(),
            slug: referralSlug!,
            email: user.email!,
            phone: phone,
          },
        });
        newCentreId = newCentre.id;
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          phone,
          role: isCentre ? "CENTRE_ADMIN" : "STUDENT",
          ...(newCentreId ? { centreId: newCentreId } : {}),
        },
      });

      if (inviteLinkId) {
        const claim = await tx.centreInviteLink.updateMany({
          where: { id: inviteLinkId, usedAt: null, expiresAt: { gt: new Date() } },
          data: { usedById: user.id, usedAt: new Date() },
        });
        if (claim.count !== 1) {
          throw new Error("INVITE_LINK_TAKEN");
        }
      }
    });

    if (isInvited) {
      await db.centreInvitation.updateMany({
        where: { email: user.email!, centreId, status: "PENDING" },
        data: { status: "ACCEPTED" },
      });
      await grantCentreSeat(centreId!, user.id);
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "INVITE_LINK_TAKEN") {
      return NextResponse.json({ success: false, error: "Invite link has just been used." }, { status: 409 });
    }
    console.error("Complete Profile error:", error);
    return NextResponse.json({ success: false, error: "Something went wrong." }, { status: 500 });
  }
}
