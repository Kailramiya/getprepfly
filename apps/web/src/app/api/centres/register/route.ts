import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// POST /api/centres/register — full centre registration flow
// Creates: user (CENTRE_ADMIN) + centre + links them
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, centreName, centreSlug, city, state } = body;

    if (!name || !email || !password || !centreName || !centreSlug) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    const emailLower = email.toLowerCase().trim();
    const slugLower = centreSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

    // Check email
    const existingUser = await db.user.findUnique({ where: { email: emailLower } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email already registered" },
        { status: 409 }
      );
    }

    // Check slug
    const existingCentre = await db.centre.findUnique({ where: { slug: slugLower } });
    if (existingCentre) {
      return NextResponse.json(
        { success: false, error: "This centre code is already taken. Try another." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create centre + admin user in a transaction
    const result = await db.$transaction(async (tx) => {
      const centre = await tx.centre.create({
        data: {
          name: centreName.trim(),
          slug: slugLower,
          email: emailLower,
          phone: phone || null,
          city: city || null,
          state: state || null,
        },
      });

      const user = await tx.user.create({
        data: {
          name: name.trim(),
          email: emailLower,
          phone: phone || null,
          passwordHash,
          role: "CENTRE_ADMIN",
          centreId: centre.id,
          studentPlan: {
            create: { planType: "FREE" },
          },
        },
      });

      return { centre, user };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          centreId: result.centre.id,
          centreSlug: result.centre.slug,
          userId: result.user.id,
        },
        message: "Centre registered successfully!",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Centre registration error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
