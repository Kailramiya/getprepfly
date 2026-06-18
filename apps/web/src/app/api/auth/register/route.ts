import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { grantCentreSeat } from "@/lib/centre-access";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { parseBody, passwordSchema, emailSchema } from "@/lib/validation";
import { sendVerificationEmail } from "@/lib/email-verification";

const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: emailSchema,
  password: passwordSchema,
  // Phone is mandatory. Normalize to digits (with optional leading +) so the
  // unique constraint can't be bypassed by inconsistent formatting.
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/[^\d+]/g, ""))
    .refine((v) => /^\+?\d{10,15}$/.test(v), "Enter a valid phone number (10–15 digits)"),
  role: z.string().optional(),
  centreName: z.string().trim().max(120).optional(),
  centreReferralCode: z.string().trim().max(60).optional(),
});

export async function POST(req: NextRequest) {
  // Per-IP throttle — prevents automated mass account creation.
  const limited = await enforceRateLimit("auth", clientIp(req));
  if (limited) return limited;

  try {
    const parsed = await parseBody(req, RegisterSchema);
    if (!parsed.ok) return parsed.response;
    const { name, email, password, phone, role, centreName, centreReferralCode } = parsed.data;

    const emailLower = email; // normalized (trimmed + lowercased) by the schema
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
      const centreNameTrimmed = centreName!.trim();
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

      referralSlug = centreReferralCode!
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

    // Admin-invited students are vouched for — auto-verify them. Everyone else
    // (self-registered students and centre admins) must verify by email.
    const isInvited = !!centreId && !isCentre;

    // Create in transaction: centre (if applicable) + user
    const user = await db.$transaction(async (tx) => {
      let newCentreId = centreId;

      if (isCentre) {
        const newCentre = await tx.centre.create({
          data: {
            name: centreName!.trim(),
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
          emailVerified: isInvited ? new Date() : null,
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

    // Mark invitation as accepted + grant 30-day (1 month) centre seat if one was used
    if (isInvited) {
      await db.centreInvitation.updateMany({
        where: { email: emailLower, centreId, status: "PENDING" },
        data: { status: "ACCEPTED" },
      });
      await grantCentreSeat(centreId!, user.id);
    } else {
      // Send the verification email (best-effort — never fail registration on it).
      sendVerificationEmail(emailLower, user.name).catch((e) =>
        console.error("[register] verification email failed:", e)
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: user,
        requiresVerification: !isInvited,
        message: isInvited
          ? "Account created successfully"
          : "Account created. Please check your email to verify your account before logging in.",
      },
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
