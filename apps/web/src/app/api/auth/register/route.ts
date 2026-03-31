import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, phone, centreSlug, role } = body;

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

    // Find centre if centreSlug provided
    let centreId: string | undefined;
    if (centreSlug) {
      const centre = await db.centre.findUnique({
        where: { slug: centreSlug },
      });
      if (!centre) {
        return NextResponse.json(
          { success: false, error: "Coaching centre not found" },
          { status: 404 }
        );
      }
      centreId = centre.id;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Determine role
    let userRole: "STUDENT" | "CENTRE_ADMIN" = "STUDENT";
    if (role === "centre") {
      userRole = "CENTRE_ADMIN";
    }

    // Create user
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: emailLower,
        phone: phone || null,
        passwordHash,
        role: userRole,
        centreId: centreId || null,
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
