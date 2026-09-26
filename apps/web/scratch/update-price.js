require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.pricingSetting.upsert({
    where: { key: 'CENTRE_MINI' },
    update: { amount: 0 },
    create: {
      key: 'CENTRE_MINI',
      label: 'Centre Mini Plan (5 students, 1 month)',
      amount: 0,
    }
  });
  console.log('Successfully updated CENTRE_MINI price to 0 (Free)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
