import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  console.log('🔍 Tekshirilmoqda...\n');
  
  // Cashbox transactions
  const transactions = await prisma.cashboxTransaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log('💰 CashboxTransaction (oxirgi 5):');
  transactions.forEach(t => {
    console.log(`  - ${t.type}: ${t.amount} UZS | ${t.description} | ${t.createdAt}`);
  });
  
  // Open shifts
  const shifts = await prisma.cashierShift.findMany({
    where: { status: 'OPEN' },
    take: 3
  });
  console.log('\n🔄 Open shifts:');
  shifts.forEach(s => {
    console.log(`  - ID: ${s.id}`);
    console.log(`    User: ${s.userId}`);
    console.log(`    CashSales: ${s.cashSales} UZS`);
    console.log(`    TotalSales: ${s.totalSales} UZS`);
    console.log(`    CashSalesUSD: ${s.cashSalesUSD} USD`);
    console.log(`    TotalSalesUSD: ${s.totalSalesUSD} USD`);
  });
  
  if (shifts.length === 0) {
    console.log('  ❌ HECH QANDAY OCHIQ SMENA YOQ!');
  }
}

check().finally(() => prisma.$disconnect());
