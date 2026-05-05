import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('48 ruchkalarni narxini yangilash...');

  // 48 ruchkalarni topish va narxlarni yangilash
  const ruchka48Products = await prisma.product.findMany({
    where: {
      name: {
        contains: 'Ruchka 48'
      }
    }
  });

  console.log(`Topildi: ${ruchka48Products.length} ta 48 ruchka`);

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

  console.log('\nBarcha 48 ruchkalarni narxlari yangilandi!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
