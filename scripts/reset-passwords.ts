import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting passwords for admin and kassir...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const cashierPassword = await bcrypt.hash('cashier123', 10);

  await prisma.user.updateMany({
    where: { login: 'admin' },
    data: { password: adminPassword },
  });

  await prisma.user.updateMany({
    where: { login: 'kassir' },
    data: { password: cashierPassword },
  });

  console.log('✅ Passwords reset successfully!');
  console.log('Admin: login="admin", password="admin123"');
  console.log('Cashier: login="kassir", password="cashier123"');
}

main()
  .catch((e) => {
    console.error(e);
    throw e;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
