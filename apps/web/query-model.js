const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const qs = await prisma.question.findMany({
    where: {
      modelAnswer: {
        contains: '{'
      }
    },
    select: {
      id: true,
      modelAnswer: true,
      type: true
    },
    take: 5
  });
  console.log(qs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
