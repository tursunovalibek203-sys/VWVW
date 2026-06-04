import { prisma } from '../server/utils/prisma';
import bcryptjs from 'bcryptjs';

async function createCashierUser() {
  try {
    const hashedPassword = await bcryptjs.hash('kassir123', 10);

    const cashier = await prisma.user.upsert({
      where: { login: 'kassir' },
      update: {
        password: hashedPassword,
        name: 'Кассир',
        role: 'CASHIER',
        active: true,
      },
      create: {
        login: 'kassir',
        password: hashedPassword,
        name: 'Кассир',
        role: 'CASHIER',
        active: true,
      },
    });

    console.log('✅ Кассир фойдаланувчи яратилди/янгиланди!');
    console.log('   👤 Логин: kassir');
    console.log('   🔐 Парол: kassir123');
    console.log('   💼 Роль: CASHIER');
  } catch (error) {
    console.error('❌ Хато:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createCashierUser();
