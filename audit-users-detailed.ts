import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditUsersDetailed() {
  try {
    console.log('\n=== FULL USER AUDIT ===');
    const users = await prisma.user.findMany();
    console.log(JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditUsersDetailed();
