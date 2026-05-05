import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestSale() {
  console.log('🛒 Test sotuv qo\'shish...\n');

  try {
    // 1. Birinchi mahsulotni olish
    const product = await prisma.product.findFirst({
      where: { warehouse: 'preform', active: true }
    });

    if (!product) {
      console.log('❌ Mahsulot topilmadi!');
      return;
    }

    console.log(`📦 Mahsulot: ${product.name}`);
    console.log(`   Narxi: $${product.pricePerBag}`);
    console.log(`   Omborda: ${product.currentStock} qop\n`);

    // 2. Birinchi mijozni olish (yoki yangi yaratish)
    let customer = await prisma.customer.findFirst();
    
    if (!customer) {
      console.log('👤 Mijoz topilmadi, yangi mijoz yaratilmoqda...');
      customer = await prisma.customer.create({
        data: {
          name: 'Test Mijoz',
          phone: '+998901234567',
          address: 'Toshkent',
          category: 'NORMAL',
          balance: 0,
          debt: 0,
          creditLimit: 0,
          paymentTermDays: 30,
          discountPercent: 0,
          notificationsEnabled: true,
          debtReminderDays: 7
        }
      });
    }

    console.log(`👤 Mijoz: ${customer.name}\n`);

    // 3. Birinchi user (sotuvchi) ni olish
    const user = await prisma.user.findFirst({
      where: { role: { in: ['ADMIN', 'SELLER'] } }
    });

    if (!user) {
      console.log('❌ Sotuvchi topilmadi!');
      return;
    }

    console.log(`👨‍💼 Sotuvchi: ${user.name}\n`);

    // 4. Sotuv yaratish
    const quantity = 5;
    const totalAmount = quantity * (product.pricePerBag || 0);

    const sale = await prisma.sale.create({
      data: {
        customerId: customer.id,
        productId: product.id,
        userId: user.id,
        quantity: quantity,
        pricePerBag: product.pricePerBag || 0,
        bagType: product.bagType || 'STANDARD',
        totalAmount: totalAmount,
        paidAmount: totalAmount, // To'liq to'langan
        currency: 'USD',
        paymentStatus: 'PAID',
        paymentDetails: JSON.stringify({ usd: totalAmount, uzs: 0, click: 0 }),
        isKocha: false,
        receiptNumber: Math.floor(Math.random() * 1000000),
        items: {
          create: {
            productId: product.id,
            quantity: quantity,
            pricePerBag: product.pricePerBag || 0,
            subtotal: totalAmount
          }
        }
      }
    });

    console.log('✅ Sotuv muvaffaqiyatli yaratildi!');
    console.log(`   ID: ${sale.id}`);
    console.log(`   Chek raqami: ${sale.receiptNumber}`);
    console.log(`   Miqdor: ${quantity} qop`);
    console.log(`   Jami summa: $${totalAmount.toFixed(2)}`);
    console.log(`   Sana: ${sale.createdAt.toLocaleString()}`);

    // 5. Sklad qoldig'ini yangilash
    await prisma.product.update({
      where: { id: product.id },
      data: {
        currentStock: { decrement: quantity }
      }
    });

    console.log(`\n📊 Ombor yangilandi: ${product.currentStock} -> ${product.currentStock - quantity} qop`);

  } catch (error) {
    console.error('❌ Xatolik:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestSale();
