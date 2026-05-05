import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('48 krishkalarni narxini yangilash...');

  // 48 krishkalarni topish va narxlarni yangilash
  const krishka48Products = await prisma.product.findMany({
    where: {
      name: {
        contains: 'Qopqoq 48'
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

  console.log('\nBarcha 48 krishkalarni narxlari yangilandi!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
