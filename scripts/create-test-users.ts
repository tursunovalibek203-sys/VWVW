import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('🔧 Test foydalanuvchilar yaratilmoqda...');

    // Admin foydalanuvchi
    const adminPasswordEnv = process.env.ADMIN_PASSWORD || 'admin123';
    const adminPassword = await bcrypt.hash(adminPasswordEnv, 10);
    const admin = await prisma.user.upsert({
      where: { login: 'admin' },
      update: {},
      create: {
        login: 'admin',
        password: adminPassword,
        name: 'Administrator',
        role: 'ADMIN',
        active: true,
      },
    });
    console.log('✅ Admin yaratildi:', admin.login);

    // Kassir foydalanuvchi
    const cashierPasswordEnv = process.env.CASHIER_PASSWORD || 'cashier123';
    const cashierPassword = await bcrypt.hash(cashierPasswordEnv, 10);
    const cashier = await prisma.user.upsert({
      where: { login: 'kassir' },
      update: {},
      create: {
        login: 'kassir',
        password: cashierPassword,
        name: 'Kassir',
        role: 'CASHIER',
        active: true,
      },
    });
    console.log('✅ Kassir yaratildi:', cashier.login);

    // Sotuvchi foydalanuvchi
    const sellerPasswordEnv = process.env.SELLER_PASSWORD || 'seller123';
    const sellerPassword = await bcrypt.hash(sellerPasswordEnv, 10);
    const seller = await prisma.user.upsert({
      where: { login: 'sotuvchi' },
      update: {},
      create: {
        login: 'sotuvchi',
        password: sellerPassword,
        name: 'Sotuvchi',
        role: 'SELLER',
        active: true,
      },
    });
    console.log('✅ Sotuvchi yaratildi:', seller.login);

    console.log('\n📋 Login ma\'lumotlari:');
    console.log('-------------------');
    console.log('Admin:');
    console.log('  Login: admin');
    console.log('  Parol:', adminPasswordEnv);
    console.log('');
    console.log('Kassir:');
    console.log('  Login: kassir');
    console.log('  Parol:', cashierPasswordEnv);
    console.log('');
    console.log('Sotuvchi:');
    console.log('  Login: sotuvchi');
    console.log('  Parol:', sellerPasswordEnv);
    console.log('-------------------');

  } catch (error) {
    console.error('❌ Xato:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();
