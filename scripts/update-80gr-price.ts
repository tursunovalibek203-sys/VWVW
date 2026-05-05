import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { name: { contains: '80 gr' } }
  });
  
  console.log('Topildi: ' + products.length + ' ta 80 gr preform');
  
  for (const product of products) {
    const newPricePerPiece = 0.152;
    const pricePerBag = newPricePerPiece * product.unitsPerBag;
    
    await prisma.product.update({
      where: { id: product.id },
      data: {
        pricePerPiece: newPricePerPiece,
        pricePerBag: pricePerBag
      }
    });
    
    console.log('Yangilandi: ' + product.name + ' - $' + newPricePerPiece + '/dona');
  }
  
  await prisma.$disconnect();
  console.log('Tayyor!');
}

main().catch(console.error);
