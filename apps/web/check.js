const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  const payments = await prisma.payment.findMany({ 
    where: { method: 'razorpay', status: 'SUCCESS' }, 
    orderBy: { createdAt: 'desc' }, 
    take: 1, 
    include: { moduleAccesses: true, studentPlan: true } 
  }); 
  console.log(JSON.stringify(payments, null, 2)); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
