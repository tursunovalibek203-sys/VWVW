import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSaleItems() {
  console.log('🔧 Sotuv elementlarini qo\'shish...\n');

  // Items siz sotuvlarni olish
  const sales = await prisma.sale.findMany({
    where: {
      items: { none: {} }
    },
    include: {
      product: true
    }
  });

  console.log(`📦 ${sales.length} ta sotuvda items yo'q\n`);

  for (const sale of sales) {
    if (sale.product) {
      // SaleItem yaratish
      await prisma.saleItem.create({
        data: {
          saleId: sale.id,
          productId: sale.productId,
          quantity: sale.quantity,
          pricePerBag: sale.pricePerBag,
          subtotal: sale.totalAmount
        }
      });
      console.log(`✅ ${sale.id} - ${sale.product.name} qo'shildi`);
    }
  }

  console.log('\n🎉 Sotuv elementlari muvaffaqiyatli qo\'shildi!');

  await prisma.$disconnect();
}

fixSaleItems();
