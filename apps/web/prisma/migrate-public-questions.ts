/**
 * One-time migration:
 *   1. Delete current public/global questions (centreId IS NULL)
 *   2. Mark `divine-success-3` centre as the official-content centre
 *   3. Mark all of that centre's existing questions as public
 *
 * After this migration, divine-success-3 acts as the global question source.
 * Future questions added by them will be auto-public (handled by API change).
 *
 * Usage:
 *   DATABASE_URL="..." npx tsx prisma/migrate-public-questions.ts
 *   DATABASE_URL="..." npx tsx prisma/migrate-public-questions.ts --slug=other-centre  # different centre
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // Parse --slug arg, default to divine-success-3
  const slugArg = process.argv.find((a) => a.startsWith("--slug="));
  const targetSlug = slugArg ? slugArg.split("=")[1] : "divine-success-3";

  console.log(`\n→ Target official-content centre: ${targetSlug}\n`);

  // Find the target centre
  const centre = await db.centre.findUnique({
    where: { slug: targetSlug },
    select: { id: true, name: true, slug: true },
  });

  if (!centre) {
    console.error(`✗ Centre with slug "${targetSlug}" not found.`);
    console.log(`\nAvailable centres:`);
    const all = await db.centre.findMany({ select: { slug: true, name: true } });
    all.forEach((c) => console.log(`  - ${c.slug.padEnd(30)} ${c.name}`));
    process.exit(1);
  }

  console.log(`✓ Found centre: ${centre.name} (id=${centre.id})\n`);

  // Step 1: Count + delete current global/public questions
  const oldPublicCount = await db.question.count({
    where: { centreId: null },
  });
  console.log(`Step 1: Deleting ${oldPublicCount} current global questions (centreId IS NULL)...`);

  if (oldPublicCount > 0) {
    // Cascading delete is on Attempts via onDelete:Cascade(? actually attempts are not cascade-deleted)
    // Soft-delete by deactivating instead, to preserve attempt history
    const deactivated = await db.question.updateMany({
      where: { centreId: null },
      data: { isActive: false, isPublic: false },
    });
    console.log(`  ✓ Deactivated ${deactivated.count} old global questions`);
  } else {
    console.log(`  (none to delete)`);
  }

  // Step 2: Mark the centre as official content
  console.log(`\nStep 2: Marking "${centre.name}" as official content centre...`);
  await db.centre.update({
    where: { id: centre.id },
    data: { isOfficialContent: true },
  });
  console.log(`  ✓ ${centre.name}.isOfficialContent = true`);

  // Step 3: Mark all of this centre's questions as public
  const centreQuestionsCount = await db.question.count({
    where: { centreId: centre.id, isActive: true },
  });
  console.log(`\nStep 3: Marking ${centreQuestionsCount} questions from "${centre.name}" as public...`);

  if (centreQuestionsCount > 0) {
    const updated = await db.question.updateMany({
      where: { centreId: centre.id, isActive: true },
      data: { isPublic: true },
    });
    console.log(`  ✓ Marked ${updated.count} questions as public`);
  } else {
    console.log(`  (no active questions in this centre yet)`);
  }

  // Summary
  console.log(`\n${"─".repeat(60)}`);
  console.log(`✓ Migration complete`);
  console.log(`${"─".repeat(60)}`);
  console.log(`  Old global questions deactivated:  ${oldPublicCount}`);
  console.log(`  ${centre.name} marked as official: yes`);
  console.log(`  ${centre.name} questions made public: ${centreQuestionsCount}`);
  console.log(`${"─".repeat(60)}\n`);

  console.log(`From now on, any new question added by ${centre.name} will be`);
  console.log(`automatically marked public and visible to all platform users.\n`);
}

main()
  .catch((e) => {
    console.error("✗ Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
