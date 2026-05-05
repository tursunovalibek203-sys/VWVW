import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSalesStructure() {
  console.log('🔍 Sotuvlar strukturasini tekshirish...\n');

  // Oxirgi sotuvni olish
  const sale = await prisma.sale.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      product: true,
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!sale) {
    console.log('❌ Sotuv topilmadi!');
    return;
  }

  console.log('📋 Sotuv ma\'lumotlari:');
  console.log(`   ID: ${sale.id}`);
  console.log(`   Mijoz: ${sale.customer?.name || 'N/A'}`);
  console.log(`   Asosiy mahsulot (productId): ${sale.product?.name || 'N/A'}`);
  console.log(`\n📦 Sotuv elementlari (items): ${sale.items.length} ta`);

  sale.items.forEach((item, i) => {
    console.log(`\n   ${i + 1}. Element:`);
    console.log(`      - ID: ${item.id}`);
    console.log(`      - productId: ${item.productId}`);
    console.log(`      - product (relation): ${item.product?.name || 'N/A'}`);
    console.log(`      - quantity: ${item.quantity}`);
    console.log(`      - pricePerBag: ${item.pricePerBag}`);
  });

  await prisma.$disconnect();
}

checkSalesStructure();
