import { prisma } from './utils/prisma.ts';

async function main() {
  // Test products
  const testProducts = [
    {
      name: 'Test Product 1',
      bagType: 'SMALL',
      unitsPerBag: 1000,
      minStockLimit: 10,
      optimalStock: 50,
      maxCapacity: 100,
      currentStock: 0,
      pricePerBag: 10000,
      warehouse: 'preform',
      active: true
    },
    {
      name: 'Test Product 2',
      bagType: 'MEDIUM',
      unitsPerBag: 1000,
      minStockLimit: 10,
      optimalStock: 50,
      maxCapacity: 100,
      currentStock: 0,
      pricePerBag: 20000,
      warehouse: 'preform',
      active: true
    },
    {
      name: 'Test Product 3',
      bagType: 'LARGE',
      unitsPerBag: 1000,
      minStockLimit: 10,
      optimalStock: 50,
      maxCapacity: 100,
      currentStock: 0,
      pricePerBag: 30000,
      warehouse: 'preform',
      active: true
    },
    {
      name: 'Test Maxsulot',
      bagType: 'SMALL',
      unitsPerBag: 1000,
      minStockLimit: 5,
      optimalStock: 20,
      maxCapacity: 50,
      currentStock: 0,
      pricePerBag: 5000,
      warehouse: 'preform',
      active: true
    },
  ];

  for (const product of testProducts) {
    const exists = await prisma.product.findFirst({ where: { name: product.name } });
    if (!exists) {
      await prisma.product.create({ data: product });
      console.log(`Mahsulot qo'shildi: ${product.name}`);
    } else {
      console.log(`Mahsulot mavjud: ${product.name}`);
    }
  }

  // Test customer
  const testCustomer = {
    name: 'Test Mijoz',
    phone: '+998991112233',
    email: 'testmijoz@example.com',
    address: 'Toshkent, test manzil',
    notificationsEnabled: true,
    category: 'NORMAL',
    balance: 0,
    balanceUZS: 0,
    balanceUSD: 0,
    debt: 0,
    debtUZS: 0,
    debtUSD: 0,
    creditLimit: 0,
    paymentTermDays: 30,
    discountPercent: 0
  };
  const customerExists = await prisma.customer.findFirst({ where: { phone: testCustomer.phone } });
  if (!customerExists) {
    await prisma.customer.create({ data: testCustomer });
    console.log(`Mijoz qo'shildi: ${testCustomer.name}`);
  } else {
    console.log(`Mijoz mavjud: ${testCustomer.name}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
