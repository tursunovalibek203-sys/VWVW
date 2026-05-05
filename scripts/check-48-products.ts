import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('48 bilan bog\'liq mahsulotlarni qidirish...');

  // Barcha 48 bilan bog'liq mahsulotlar
  const all48Products = await prisma.product.findMany({
    where: {
      name: {
        contains: '48'
      }
    }
  });

  console.log(`\nTopildi: ${all48Products.length} ta 48 bilan bog'liq mahsulot:\n`);
  
  all48Products.forEach(p => {
    console.log(`- ${p.name}`);
    console.log(`  pricePerPiece: ${p.pricePerPiece}, pricePerBag: ${p.pricePerBag}, unitsPerBag: ${p.unitsPerBag}`);
  });

  // Krishka/Cap/Qopqoq bilan 48
  const krishka48 = await prisma.product.findMany({
    where: {
      AND: [
        { name: { contains: '48' } },
        { OR: [
          { name: { contains: 'krishka' } },
          { name: { contains: 'cap' } },
          { name: { contains: 'qopqoq' } },
          { name: { contains: 'Qopqoq' } }
        ]}
      ]
    }
  });

  console.log(`\n48 krishka/cap/qopqoq: ${krishka48.length} ta`);
  krishka48.forEach(p => console.log(`- ${p.name}`));

  // Ruchka/Handle bilan 48
  const ruchka48 = await prisma.product.findMany({
    where: {
      AND: [
        { name: { contains: '48' } },
        { OR: [
          { name: { contains: 'ruchka' } },
          { name: { contains: 'handle' } },
          { name: { contains: 'Ruchka' } }
        ]}
      ]
    }
  });

  console.log(`\n48 ruchka/handle: ${ruchka48.length} ta`);
  ruchka48.forEach(p => console.log(`- ${p.name}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
