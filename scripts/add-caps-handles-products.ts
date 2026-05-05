import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Qopqoq va tutqich mahsulotlarini qo\'shish...');

  const products = [
    // 28mm Qopqoqlar (Кришка) - 5,000 dona
    { name: 'Кришка 28 кук газ', pricePerBag: 5000, unitsPerBag: 5000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 28 галубой газ', pricePerBag: 5000, unitsPerBag: 5000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 28 сарик газ', pricePerBag: 5000, unitsPerBag: 5000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 28 яшил газ', pricePerBag: 5000, unitsPerBag: 5000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 28 кизил газ', pricePerBag: 5000, unitsPerBag: 5000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 28 ок', pricePerBag: 5000, unitsPerBag: 5000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 28 кора газ', pricePerBag: 5000, unitsPerBag: 5000, bagType: 'Qopqoq', currentStock: 100 },
    
    // 38mm Qopqoqlar (Кришка) - 3,000 dona
    { name: 'Кришка 38 сарик', pricePerBag: 3000, unitsPerBag: 3000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 38 ок', pricePerBag: 3000, unitsPerBag: 3000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 38 кук', pricePerBag: 3000, unitsPerBag: 3000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 38 яшил', pricePerBag: 3000, unitsPerBag: 3000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 38 кизил', pricePerBag: 3000, unitsPerBag: 3000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 38 олов ранг', pricePerBag: 3000, unitsPerBag: 3000, bagType: 'Qopqoq', currentStock: 100 },
    
    // 48mm Qopqoqlar (Кришка) - 1,000 dona
    { name: 'Кришка 48 кук', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 галубой', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 сарик', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 Доня', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 Бекажон', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 яшил', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 апелсин', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 кизил', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 сайхун', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 салат', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    { name: 'Кришка 48 ок', pricePerBag: 1000, unitsPerBag: 1000, bagType: 'Qopqoq', currentStock: 100 },
    
    // 48mm Tutqichlar (Ручка) - 1,500 dona
    { name: 'Ручка 48 кук', pricePerBag: 1500, unitsPerBag: 1500, bagType: 'Ruchka', currentStock: 100 },
    { name: 'Ручка 48 сарик', pricePerBag: 1500, unitsPerBag: 1500, bagType: 'Ruchka', currentStock: 100 },
    { name: 'Ручка 48 яшил', pricePerBag: 1500, unitsPerBag: 1500, bagType: 'Ruchka', currentStock: 100 },
    { name: 'Ручка 48 кизил', pricePerBag: 1500, unitsPerBag: 1500, bagType: 'Ruchka', currentStock: 100 },
    { name: 'Ручка 48 олов ранг', pricePerBag: 1500, unitsPerBag: 1500, bagType: 'Ruchka', currentStock: 100 },
    { name: 'Ручка 48 ок', pricePerBag: 1500, unitsPerBag: 1500, bagType: 'Ruchka', currentStock: 100 },
    { name: 'Ручка 48 хаво ранг', pricePerBag: 1500, unitsPerBag: 1500, bagType: 'Ruchka', currentStock: 100 },
    { name: 'Ручка 48 жигар ранг', pricePerBag: 1500, unitsPerBag: 1500, bagType: 'Ruchka', currentStock: 100 },
  ];

  let created = 0;
  let updated = 0;

  for (const product of products) {
    const existing = await prisma.product.findUnique({
      where: { name: product.name }
    });

    if (existing) {
      await prisma.product.update({
        where: { name: product.name },
        data: {
          pricePerBag: product.pricePerBag,
          unitsPerBag: product.unitsPerBag,
          bagType: product.bagType,
          currentStock: product.currentStock,
          currentUnits: product.currentStock * product.unitsPerBag,
          minStockLimit: 20,
          optimalStock: 150,
          maxCapacity: 500
        }
      });
      updated++;
    } else {
      await prisma.product.create({
        data: {
          ...product,
          currentUnits: product.currentStock * product.unitsPerBag,
          minStockLimit: 20,
          optimalStock: 150,
          maxCapacity: 500
        }
      });
      created++;
    }
  }

  console.log(`✅ ${created} ta yangi mahsulot qo'shildi`);
  console.log(`✅ ${updated} ta mahsulot yangilandi`);
  console.log(`🎉 Jami: ${products.length} ta mahsulot`);
  console.log(`   - 28mm Qopqoqlar: 7 ta`);
  console.log(`   - 38mm Qopqoqlar: 6 ta`);
  console.log(`   - 48mm Qopqoqlar: 11 ta`);
  console.log(`   - 48mm Tutqichlar: 8 ta`);
}

main()
  .catch((e) => {
    console.error('❌ Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
