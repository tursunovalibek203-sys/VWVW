import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCapsAndHandles() {
  console.log('🔄 Qopqoq va ruchkalarni to\'g\'ri omborga ko\'chirish...\n');

  // 1. Кришka (qopqoq) mahsulotlarni topish
  const krishkaProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'Кришка', mode: 'insensitive' } },
        { name: { contains: 'krishka', mode: 'insensitive' } },
        { name: { contains: 'qopqoq', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`🔍 ${krishkaProducts.length} ta qopqoq topildi`);

  // 2. Ручka (ruchka) mahsulotlarni topish
  const ruchkaProducts = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: 'Ручка', mode: 'insensitive' } },
        { name: { contains: 'ruchka', mode: 'insensitive' } },
        { name: { contains: 'handle', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`🔍 ${ruchkaProducts.length} ta ruchka topildi\n`);

  // 3. Qopqoqlarni yangilash
  let krishkaUpdated = 0;
  for (const product of krishkaProducts) {
    const sizeMatch = product.name.match(/(\d+)/);
    const size = sizeMatch ? sizeMatch[1] : 'Unknown';
    
    await prisma.product.update({
      where: { id: product.id },
      data: {
        warehouse: 'krishka',
        bagType: `Qopqoq ${size}mm`
      }
    });
    krishkaUpdated++;
    console.log(`   ✅ ${product.name} -> krishka`);
  }

  // 4. Ruchkalarni yangilash
  let ruchkaUpdated = 0;
  for (const product of ruchkaProducts) {
    const sizeMatch = product.name.match(/(\d+)/);
    const size = sizeMatch ? sizeMatch[1] : 'Unknown';
    
    await prisma.product.update({
      where: { id: product.id },
      data: {
        warehouse: 'ruchka',
        bagType: `Ruchka ${size}mm`
      }
    });
    ruchkaUpdated++;
    console.log(`   ✅ ${product.name} -> ruchka`);
  }

  console.log(`\n🎉 Jami ${krishkaUpdated + ruchkaUpdated} ta mahsulot to'g'ri omborga ko'chirildi!`);
  console.log(`   Qopqoqlar: ${krishkaUpdated} ta`);
  console.log(`   Ruchkalar: ${ruchkaUpdated} ta`);

  await prisma.$disconnect();
}

fixCapsAndHandles()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
