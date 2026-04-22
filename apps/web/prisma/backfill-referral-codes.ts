/**
 * Backfill referral codes for existing centres that are missing them.
 *
 * Usage:
 *   DATABASE_URL="your-prod-db-url" npx tsx prisma/backfill-referral-codes.ts
 *
 * Safe to run multiple times — only updates centres with missing/invalid slugs.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

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

async function generateUniqueSlug(base: string, excludeCentreId?: string): Promise<string> {
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

async function main() {
  console.log("Starting referral code backfill...\n");

  const centres = await db.centre.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Found ${centres.length} centres\n`);

  let updated = 0;
  let alreadyValid = 0;

  for (const centre of centres) {
    const isInvalid =
      !centre.slug ||
      centre.slug.trim() === "" ||
      centre.slug.length < 3 ||
      !/^[a-z0-9-]+$/.test(centre.slug);

    if (!isInvalid) {
      alreadyValid++;
      console.log(`[OK]   "${centre.name}" -> ${centre.slug}`);
      continue;
    }

    // Generate base slug from centre name, fallback to email prefix, fallback to centre ID
    let baseSlug = slugify(centre.name);

    if (!baseSlug && centre.email) {
      const emailPrefix = centre.email.split("@")[0] || "";
      baseSlug = slugify(emailPrefix);
    }

    if (!baseSlug) {
      baseSlug = `centre-${centre.id.slice(0, 6)}`;
    }

    const uniqueSlug = await generateUniqueSlug(baseSlug, centre.id);

    await db.centre.update({
      where: { id: centre.id },
      data: { slug: uniqueSlug },
    });

    console.log(`[FIX]  "${centre.name}" -> ${uniqueSlug} (was: "${centre.slug}")`);
    updated++;
  }

  console.log(`\n---\nAlready valid: ${alreadyValid}\nUpdated: ${updated}\nTotal: ${centres.length}`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
