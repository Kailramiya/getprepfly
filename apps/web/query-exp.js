const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const qs = await prisma.question.findMany({
    where: {
      explanation: {
        contains: '{'
      }
    },
    select: {
      id: true,
      explanation: true
    },
    take: 5
  });
  console.log(qs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
