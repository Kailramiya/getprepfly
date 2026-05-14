import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { grantCentreSeat } from "@/lib/centre-access";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      password,
      phone,
      role,
      centreName,
      centreReferralCode,
    } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const isCentre = role === "centre";

    // Centre-specific validation
    if (isCentre) {
      if (!centreName?.trim()) {
        return NextResponse.json(
          { success: false, error: "Centre name is required" },
          { status: 400 }
        );
      }
      if (!centreReferralCode?.trim()) {
        return NextResponse.json(
          { success: false, error: "Referral code is required" },
          { status: 400 }
        );
      }
      if (centreReferralCode.length < 3) {
        return NextResponse.json(
          { success: false, error: "Referral code must be at least 3 characters" },
          { status: 400 }
        );
      }
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: emailLower },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check phone uniqueness if provided
    if (phone) {
      const existingPhone = await db.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: "This phone number is already registered" },
          { status: 409 }
        );
      }
    }

    // For centre registration: check duplicate centre name + referral code
    let referralSlug: string | undefined;
    if (isCentre) {
      const centreNameTrimmed = centreName.trim();
      const existingCentreName = await db.centre.findFirst({
        where: {
          name: { equals: centreNameTrimmed, mode: "insensitive" },
        },
      });
      if (existingCentreName) {
        return NextResponse.json(
          { success: false, error: "A centre with this name already exists. Please use a different name." },
          { status: 409 }
        );
      }

      referralSlug = centreReferralCode
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const existingSlug = await db.centre.findUnique({
        where: { slug: referralSlug },
      });
      if (existingSlug) {
        return NextResponse.json(
          { success: false, error: "This referral code is already taken. Please choose a different one." },
          { status: 409 }
        );
      }
    }

    // Check if there is a pending centre invitation for this email
    let centreId: string | undefined;
    if (!isCentre) {
      const invitation = await db.centreInvitation.findFirst({
        where: { email: emailLower, status: "PENDING" },
        orderBy: { createdAt: "desc" },
      });
      if (invitation && invitation.expiresAt > new Date()) {
        centreId = invitation.centreId;
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create in transaction: centre (if applicable) + user
    const user = await db.$transaction(async (tx) => {
      let newCentreId = centreId;

      if (isCentre) {
        const newCentre = await tx.centre.create({
          data: {
            name: centreName.trim(),
            slug: referralSlug!,
            email: emailLower,
            phone: phone || null,
          },
        });
        newCentreId = newCentre.id;
      }

      return tx.user.create({
        data: {
          name: name.trim(),
          email: emailLower,
          phone: phone || null,
          passwordHash,
          role: isCentre ? "CENTRE_ADMIN" : "STUDENT",
          centreId: newCentreId || null,
          studentPlan: {
            create: { planType: "FREE" },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    });

    // Mark invitation as accepted + grant 90-day centre seat if one was used
    if (centreId && !isCentre) {
      await db.centreInvitation.updateMany({
        where: { email: emailLower, centreId, status: "PENDING" },
        data: { status: "ACCEPTED" },
      });
      await grantCentreSeat(centreId, user.id);
    }

    return NextResponse.json(
      { success: true, data: user, message: "Account created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
