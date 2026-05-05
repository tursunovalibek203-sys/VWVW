import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBagTypes() {
  console.log('🔄 BagType larni to\'g\'rilash...\n');

  const products = await prisma.product.findMany({
    where: { bagType: 'Boshqa' },
    orderBy: { name: 'asc' }
  });

  console.log(`📦 Jami ${products.length} ta "Boshqa" mahsulot topildi\n`);

  for (const product of products) {
    const name = product.name;
    let newBagType: string;

    // Bottle products
    if (name.includes('Bottle')) {
      const sizeMatch = name.match(/(\d+\.?\d*)/);
      const size = sizeMatch ? sizeMatch[1] : 'Other';
      newBagType = `Bottle ${size}L`;
    }
    // Preform products with mm
    else if (name.includes('Preform') || name.includes('preform')) {
      const sizeMatch = name.match(/(\d+)/);
      const size = sizeMatch ? sizeMatch[1] : 'Other';
      newBagType = `Preform ${size}mm`;
    }
    // Others
    else {
      newBagType = product.name;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { bagType: newBagType }
    });
    console.log(`✅ ${product.name} -> ${newBagType}`);
  }

  console.log('\n🎉 BagType lar muvaffaqiyatli yangilandi!');

  await prisma.$disconnect();
}

fixBagTypes()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
