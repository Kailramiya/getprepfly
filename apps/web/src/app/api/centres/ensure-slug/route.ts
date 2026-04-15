import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth-utils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

async function generateUniqueSlug(base: string, excludeCentreId: string): Promise<string> {
  let slug = base || "centre";
  let counter = 1;

  while (true) {
    const existing = await db.centre.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing || existing.id === excludeCentreId) {
      return slug;
    }
    counter++;
    slug = `${base}-${counter}`;
  }
}

// POST /api/centres/ensure-slug — ensures the current centre admin has a centre with a valid referral slug
// If the centre admin has no centre at all, creates one using their name/email
// Safe no-op if centre + slug are already valid
export async function POST() {
  const { user, error } = await requireRole(["CENTRE_ADMIN", "SUPER_ADMIN"]);
  if (error) return error;

  // Fetch the full user record to get their name/email for centre creation
  const dbUser = await db.user.findUnique({
    where: { id: user!.id },
    select: { id: true, name: true, email: true, centreId: true, role: true },
  });

  if (!dbUser) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  // If centre admin has no centre at all, create one from their name/email
  if (!dbUser.centreId) {
    if (dbUser.role !== "CENTRE_ADMIN") {
      return NextResponse.json(
        { success: false, error: "Only centre admins can create a centre this way" },
        { status: 400 }
      );
    }

    const emailPrefix = dbUser.email.split("@")[0] || "";
    const baseSlug = slugify(dbUser.name) || slugify(emailPrefix) || `centre-${dbUser.id.slice(0, 6)}`;
    const uniqueSlug = await generateUniqueSlug(baseSlug, dbUser.id);
    const centreName = dbUser.name?.trim() || emailPrefix || "My Coaching Centre";

    const newCentre = await db.centre.create({
      data: {
        name: centreName,
        slug: uniqueSlug,
        email: dbUser.email,
      },
    });

    await db.user.update({
      where: { id: dbUser.id },
      data: { centreId: newCentre.id },
    });

    return NextResponse.json({
      success: true,
      data: { slug: newCentre.slug, name: newCentre.name },
      message: "Centre and referral code created successfully",
    });
  }

  const centre = await db.centre.findUnique({
    where: { id: dbUser.centreId },
    select: { id: true, name: true, slug: true, email: true },
  });

  if (!centre) {
    return NextResponse.json(
      { success: false, error: "Centre not found" },
      { status: 404 }
    );
  }

  // Check if current slug is valid
  const isValid =
    centre.slug &&
    centre.slug.trim().length >= 3 &&
    /^[a-z0-9-]+$/.test(centre.slug);

  if (isValid) {
    return NextResponse.json({
      success: true,
      data: { slug: centre.slug, name: centre.name },
      message: "Referral code is already valid",
    });
  }

  // Generate a new slug
  let baseSlug = slugify(centre.name);

  if (!baseSlug && centre.email) {
    const emailPrefix = centre.email.split("@")[0] || "";
    baseSlug = slugify(emailPrefix);
  }

  if (!baseSlug) {
    baseSlug = `centre-${centre.id.slice(0, 6)}`;
  }

  const uniqueSlug = await generateUniqueSlug(baseSlug, centre.id);

  const updated = await db.centre.update({
    where: { id: centre.id },
    data: { slug: uniqueSlug },
    select: { slug: true, name: true },
  });

  return NextResponse.json({
    success: true,
    data: updated,
    message: "Referral code generated successfully",
  });
}
