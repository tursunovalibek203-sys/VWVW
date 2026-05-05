import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Kapsula mahsulotlarini qo\'shish...');

  const products = [
    // 15 gramm - 20,000 so'm
    { name: 'Kapsula 15 gr prazrach', pricePerBag: 20000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 15 gr gidro', pricePerBag: 20000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 15 gr siniy', pricePerBag: 20000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 15 gr sprite', pricePerBag: 20000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 15 gr kizil', pricePerBag: 20000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 15 gr kora', pricePerBag: 20000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 21 gramm - 15,000 so'm
    { name: 'Kapsula 21 gr prazrach', pricePerBag: 15000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 21 gr gidro', pricePerBag: 15000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 21 gr gd Oktosh', pricePerBag: 15000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 21 gr siniy', pricePerBag: 15000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 21 gr sprite', pricePerBag: 15000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 21 gr ёd', pricePerBag: 15000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 21 gr ok', pricePerBag: 15000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 26 gramm - 12,000 so'm
    { name: 'Kapsula 26 gr ёг', pricePerBag: 12000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 30 gramm - 10,000 so'm
    { name: 'Kapsula 30 gr prazrach', pricePerBag: 10000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 30 gr gidro', pricePerBag: 10000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 30 gr gd Oktosh', pricePerBag: 10000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 30 gr sprite', pricePerBag: 10000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 30 gr siniy', pricePerBag: 10000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 36 gramm - 10,000 so'm
    { name: 'Kapsula 36 gr ёг', pricePerBag: 10000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 52 gramm - 6,000 so'm
    { name: 'Kapsula 52 gr prazrach', pricePerBag: 6000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 52 gr ok', pricePerBag: 6000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 70 gramm - 4,500 so'm
    { name: 'Kapsula 70 gr prazrach', pricePerBag: 4500, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 70 gr gidro', pricePerBag: 4500, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 70 gr sayxun', pricePerBag: 4500, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 70 gr siniy', pricePerBag: 4500, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 75 gramm - 3,000-4,000 so'm
    { name: 'Kapsula 75 gr prazrach', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 75 gr sayxun', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 75 gr gidro', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 75 gr gidro 2', pricePerBag: 3000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 75 gr siniy', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 75 gr siniy 2', pricePerBag: 3000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 80 gramm - 3,000-4,000 so'm
    { name: 'Kapsula 80 gr prazrach', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 80 gr prazrach 2', pricePerBag: 3000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 80 gr gidro', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 80 gr gidro 2', pricePerBag: 3000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 80 gr sayxun', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 80 gr sayxun 2', pricePerBag: 3000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 80 gr siniy', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 80 gr siniy 2', pricePerBag: 3000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 85 gramm - 3,000-4,000 so'm
    { name: 'Kapsula 85 gr prazrach', pricePerBag: 3000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 85 gr prazrach 2', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 86 gramm - 3,000-4,000 so'm
    { name: 'Kapsula 86 gr prazrach', pricePerBag: 3000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 86 gr prazrach 2', pricePerBag: 4000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 135 gramm - 2,000-2,500 so'm
    { name: 'Kapsula 135 gr prazrach', pricePerBag: 2500, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 135 gr prazrach 2', pricePerBag: 2000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 135 gr gidro', pricePerBag: 2500, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 135 gr gidro 2', pricePerBag: 2000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 135 gr sayxun', pricePerBag: 2500, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 135 gr sayxun +', pricePerBag: 2000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 135 gr siniy', pricePerBag: 2500, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 135 gr siniy 2', pricePerBag: 2000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    
    // 250 gramm - 2,000 so'm
    { name: 'Kapsula 250 gr nestle', pricePerBag: 2000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
    { name: 'Kapsula 250 gr siniy', pricePerBag: 2000, unitsPerBag: 1000, bagType: 'Kapsula', currentStock: 100 },
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
}

main()
  .catch((e) => {
    console.error('❌ Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
