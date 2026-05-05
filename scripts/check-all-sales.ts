import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllSales() {
  console.log('🔍 Barcha sotuvlarni tekshirish...\n');

  const sales = await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      product: true,
      items: {
        include: {
          product: true
        }
      }
    }
  });

  console.log(`📋 Oxirgi ${sales.length} ta sotuv:\n`);

  sales.forEach((sale, idx) => {
    console.log(`${idx + 1}. Sotuv ID: ${sale.id}`);
    console.log(`   Mijoz: ${sale.customer?.name || 'N/A'}`);
    console.log(`   Asosiy mahsulot (product): ${sale.product?.name || 'N/A'}`);
    console.log(`   Sotuv elementlari (items): ${sale.items.length} ta`);

    if (sale.items.length > 0) {
      sale.items.forEach((item, i) => {
        console.log(`      ${i + 1}. ${item.product?.name || 'N/A'} - ${item.quantity} qop`);
      });
    }
    console.log('');
  });

  // Statistika
  const allSales = await prisma.sale.findMany({
    include: { items: true }
  });

  const withItems = allSales.filter(s => s.items.length > 0).length;
  const withoutItems = allSales.filter(s => s.items.length === 0).length;

  console.log(`📊 Umumiy statistika:`);
  console.log(`   Jami sotuvlar: ${allSales.length}`);
  console.log(`   Items bilan: ${withItems}`);
  console.log(`   Items siz: ${withoutItems}`);

  await prisma.$disconnect();
}

checkAllSales();
