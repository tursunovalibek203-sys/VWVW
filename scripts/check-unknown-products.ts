import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUnknownProducts() {
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { bagType: 'Unknowngr' },
        { bagType: 'Boshqa' },
        { bagType: '' }
      ]
    },
    orderBy: { name: 'asc' }
  });

  console.log(`❓ Nomi gram ko'rsatkichsiz mahsulotlar (${products.length} ta):\n`);
  
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name}`);
    console.log(`   Warehouse: ${p.warehouse}, BagType: ${p.bagType}, Units: ${p.unitsPerBag}`);
  });

  await prisma.$disconnect();
}

checkUnknownProducts();
