import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function auditUsers() {
  try {
    console.log('\n=== USER AUDIT ===');
    const users = await prisma.user.findMany();
    console.log(`Total users: ${users.length}`);
    users.forEach(user => {
      console.log(`\n  ID: ${user.id}`);
      console.log(`  Login: ${user.login}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Active: ${user.active}`);
      console.log(`  Password Hash: ${user.password.substring(0, 20)}...`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

auditUsers();
