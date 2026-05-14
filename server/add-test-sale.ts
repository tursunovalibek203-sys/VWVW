import { prisma } from './utils/prisma.ts';

async function main() {
  // Find test customer and product
  const customer = await prisma.customer.findFirst({ where: { phone: '+998991112233' } });
  const product = await prisma.product.findFirst({ where: { name: 'Test Maxsulot' } });
  const user = await prisma.user.findFirst(); // Use any user for sale (first one)

  if (!customer) {
    console.error('Test mijoz topilmadi!');
    process.exit(1);
  }
  if (!product) {
    console.error('Test maxsulot topilmadi!');
    process.exit(1);
  }
  if (!user) {
    console.error('User topilmadi!');
    process.exit(1);
  }

  // Create sale
  const sale = await prisma.sale.create({
    data: {
      customerId: customer.id,
      productId: product.id,
      userId: user.id,
      quantity: 2,
      pricePerBag: product.pricePerBag,
      bagType: product.bagType,
      totalAmount: product.pricePerBag * 2,
      paidAmount: product.pricePerBag * 2,
      currency: 'UZS',
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      driverPaymentStatus: 'PENDING',
      createdAt: new Date(),
    },
  });

  console.log('Test savdo yaratildi:', sale.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
