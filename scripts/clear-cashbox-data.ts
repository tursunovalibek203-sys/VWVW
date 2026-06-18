import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearCashboxData() {
  console.log('🧹 Kassa ma\'lumotlarini tozalash boshlandi...');

  try {
    // 1. Barcha kassa tranzaksiyalarini o'chirish
    const deletedTransactions = await prisma.cashboxTransaction.deleteMany({});
    console.log(`✅ CashboxTransaction lar o'chirildi: ${deletedTransactions.count} ta`);

    // 2. Barcha kassir smenalarini o'chirish
    const deletedShifts = await prisma.cashierShift.deleteMany({});
    console.log(`✅ CashierShift lar o'chirildi: ${deletedShifts.count} ta`);

    console.log('\n🎉 Kassa ma\'lumotlari muvaffaqiyatli tozalandi!');
    console.log('💰 Kassa balansi 0 ga qaytarildi.');
    console.log('📋 Boshqa ma\'lumotlar (Sotuvlar, Mijozlar, Mahsulotlar) o\'zgarishsiz qoldi.');

  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearCashboxData().catch(console.error);
