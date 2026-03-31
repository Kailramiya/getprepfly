import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

// GET /api/centres — list all centres (super admin) or get own centre
export async function GET() {
  const { user, error } = await requireRole(["SUPER_ADMIN", "CENTRE_ADMIN"]);
  if (error) return error;

  if (user!.role === "SUPER_ADMIN") {
    const centres = await db.centre.findMany({
      include: {
        _count: { select: { users: true } },
        subscriptions: { where: { status: "ACTIVE" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: centres });
  }

  // Centre admin — get own centre
  const centre = await db.centre.findUnique({
    where: { id: user!.centreId! },
    include: {
      _count: { select: { users: true, batches: true } },
      batches: { include: { _count: { select: { members: true } } } },
      subscriptions: { where: { status: "ACTIVE" }, take: 1 },
    },
  });

  return NextResponse.json({ success: true, data: centre });
}

// POST /api/centres — create a new centre (super admin or new centre registration)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, slug, email, phone, city, state, address, primaryColor, adminUserId } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { success: false, error: "Name and slug are required" },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const existing = await db.centre.findUnique({ where: { slug: slug.toLowerCase() } });
  if (existing) {
    return NextResponse.json(
      { success: false, error: "This centre code is already taken" },
      { status: 409 }
    );
  }

  const centre = await db.centre.create({
    data: {
      name: name.trim(),
      slug: slug.toLowerCase().trim(),
      email,
      phone,
      city,
      state,
      address,
      primaryColor: primaryColor || "#0D9488",
    },
  });

  // If adminUserId provided, link user as centre admin
  if (adminUserId) {
    await db.user.update({
      where: { id: adminUserId },
      data: { centreId: centre.id, role: "CENTRE_ADMIN" },
    });
  }

  return NextResponse.json(
    { success: true, data: centre, message: "Centre created successfully" },
    { status: 201 }
  );
}
