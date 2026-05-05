import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRemainingProducts() {
  console.log('🔄 Qolgan mahsulotlarni tartibga solish...\n');

  const products = await prisma.product.findMany({
    where: { bagType: 'Boshqa' },
    orderBy: { name: 'asc' }
  });

  console.log(`📦 Jami ${products.length} ta "Boshqa" mahsulot topildi\n`);

  for (const product of products) {
    const name = product.name.toLowerCase();
    let newWarehouse = product.warehouse;
    let newBagType = product.bagType;

    // Bottle Cap -> krishka
    if (name.includes('cap') || name.includes('qopqoq') || name.includes('krishka')) {
      newWarehouse = 'krishka';
      const sizeMatch = name.match(/(\d+)/);
      const size = sizeMatch ? sizeMatch[1] : 'Other';
      newBagType = `Qopqoq ${size}mm`;
    }
    // Bottle -> preform with size
    else if (name.includes('bottle')) {
      newWarehouse = 'preform';
      const sizeMatch = name.match(/(\d+\.?\d*)/);
      const size = sizeMatch ? sizeMatch[1] : 'Other';
      newBagType = `Bottle ${size}L`;
    }
    // Preform with mm -> preform with size
    else if (name.includes('preform')) {
      newWarehouse = 'preform';
      const sizeMatch = name.match(/(\d+)/);
      const size = sizeMatch ? sizeMatch[1] : 'Other';
      newBagType = `Preform ${size}mm`;
    }
    // PET Granule -> other
    else if (name.includes('granule') || name.includes('granula')) {
      newWarehouse = 'other';
      newBagType = 'Xomashyo';
    }

    if (newBagType !== product.bagType || newWarehouse !== product.warehouse) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          warehouse: newWarehouse,
          bagType: newBagType
        }
      });
      console.log(`✅ ${product.name} -> ${newWarehouse} (${newBagType})`);
    }
  }

  console.log('\n🎉 Barcha mahsulotlar tartibga solindi!');

  await prisma.$disconnect();
}

fixRemainingProducts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
