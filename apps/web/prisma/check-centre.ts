/**
 * Diagnostic: check centre status for all centre admins.
 *
 * Usage:
 *   DATABASE_URL="your-prod-db-url" npx tsx prisma/check-centre.ts
 *   DATABASE_URL="your-prod-db-url" npx tsx prisma/check-centre.ts amankundu252@gmail.com
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const filterEmail = process.argv[2];

  const where = filterEmail
    ? { email: filterEmail.toLowerCase() }
    : { role: "CENTRE_ADMIN" as const };

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      centreId: true,
      centre: { select: { id: true, name: true, slug: true } },
    },
  });

  console.log(`\nFound ${users.length} user(s)\n`);
  console.log("─".repeat(90));

  for (const u of users) {
    console.log(`User:   ${u.name} (${u.email})`);
    console.log(`Role:   ${u.role}`);
    if (u.centre) {
      console.log(`Centre: ${u.centre.name}`);
      console.log(`Slug:   ${u.centre.slug}  (referral code)`);
      console.log(`Status: ✓ OK`);
    } else if (u.centreId) {
      console.log(`Status: ⚠ BROKEN — centreId=${u.centreId} but no centre found`);
    } else {
      console.log(`Status: ✗ NO CENTRE — centre admin has no centre assigned`);
    }
    console.log("─".repeat(90));
  }

  // Also check centres
  const centres = await db.centre.findMany({
    select: { id: true, name: true, slug: true, _count: { select: { users: true } } },
  });

  console.log(`\nAll centres (${centres.length}):\n`);
  for (const c of centres) {
    console.log(`  ${c.name.padEnd(30)} slug=${c.slug.padEnd(25)} users=${c._count.users}`);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
