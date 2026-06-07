import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const adminHash = await bcrypt.hash('admin123', 10);
await prisma.user.upsert({
  where: { login: 'admin' },
  update: { password: adminHash, active: true },
  create: { login: 'admin', password: adminHash, name: 'Admin', role: 'ADMIN', active: true }
});

const kassirHash = await bcrypt.hash('kassir123', 10);
await prisma.user.upsert({
  where: { login: 'kassir' },
  update: { password: kassirHash, active: true },
  create: { login: 'kassir', password: kassirHash, name: 'Kassir', role: 'CASHIER', active: true }
});

console.log('Done: admin + kassir created');
await prisma.$disconnect();
