import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check15grProducts() {
  console.log('🔍 15gr mahsulotlarni tekshirish...\n');

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: '15', mode: 'insensitive' } },
        { bagType: { contains: '15', mode: 'insensitive' } }
      ],
      active: true
    },
    orderBy: { name: 'asc' }
  });

  const gr15Products = products.filter(p => {
    const name = p.name.toLowerCase();
    return name.includes('15') && (name.includes('gr') || name.includes('g'));
  });

  console.log(`📦 15gr mahsulotlar: ${gr15Products.length} ta\n`);

  gr15Products.forEach((product, i) => {
    console.log(`${i + 1}. ${product.name}`);
    console.log(`   Omborda: ${product.currentStock} qop`);
    console.log(`   Narxi: $${product.pricePerBag}`);
    console.log(`   BagType: ${product.bagType}`);
    console.log(`   Ombor: ${product.warehouse}`);
    console.log('');
  });

  console.log(`📊 Jami: ${gr15Products.length} ta 15gr mahsulot`);

  await prisma.$disconnect();
}

check15grProducts();
