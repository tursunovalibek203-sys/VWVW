import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('48 krishka va ruchka narxlarini yangilash (Kirill yozuvida)...');

  // 48 krishka (Кришка 48)
  const krishka48Products = await prisma.product.findMany({
    where: {
      name: {
        contains: 'Кришка 48'
      }
    }
  });

  console.log(`Topildi: ${krishka48Products.length} ta 48 krishka`);

  for (const product of krishka48Products) {
    const newPricePerPiece = 0.012;
    const newPricePerBag = newPricePerPiece * product.unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        pricePerPiece: newPricePerPiece,
        pricePerBag: newPricePerBag
      }
    });

    console.log(`Yangilandi: ${product.name}`);
    console.log(`  - pricePerPiece: ${newPricePerPiece} (oldingi: ${product.pricePerPiece})`);
    console.log(`  - pricePerBag: ${newPricePerBag} (oldingi: ${product.pricePerBag})`);
  }

  // 48 ruchka (Ручка 48)
  const ruchka48Products = await prisma.product.findMany({
    where: {
      name: {
        contains: 'Ручка 48'
      }
    }
  });

  console.log(`\nTopildi: ${ruchka48Products.length} ta 48 ruchka`);

  for (const product of ruchka48Products) {
    const newPricePerPiece = 0.16;
    const newPricePerBag = newPricePerPiece * product.unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        pricePerPiece: newPricePerPiece,
        pricePerBag: newPricePerBag
      }
    });

    console.log(`Yangilandi: ${product.name}`);
    console.log(`  - pricePerPiece: ${newPricePerPiece} (oldingi: ${product.pricePerPiece})`);
    console.log(`  - pricePerBag: ${newPricePerBag} (oldingi: ${product.pricePerBag})`);
  }

  console.log('\nBarcha 48 krishka va ruchka narxlari yangilandi!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
