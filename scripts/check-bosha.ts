import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBoshqa() {
  const products = await prisma.product.findMany({
    where: { bagType: 'Boshqa' },
    orderBy: { name: 'asc' }
  });

  console.log(`"Boshqa" mahsulotlar: ${products.length} ta\n`);
  products.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (warehouse: ${p.warehouse})`);
  });

  // Check Unknowngr too
  const unknown = await prisma.product.findMany({
    where: { bagType: 'Unknowngr' },
    orderBy: { name: 'asc' }
  });

  console.log(`\n"Unknowngr" mahsulotlar: ${unknown.length} ta\n`);
  unknown.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name} (warehouse: ${p.warehouse})`);
  });

  await prisma.$disconnect();
}

checkBoshqa();
