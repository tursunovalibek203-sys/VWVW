import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { login: 'admin' },
    update: {},
    create: {
      login: 'admin',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.login);

  // Create cashier user
  const kassirPassword = await bcrypt.hash('kassir123', 10);
  const kassir = await prisma.user.upsert({
    where: { login: 'kassir' },
    update: {},
    create: {
      login: 'kassir',
      password: kassirPassword,
      name: 'Kassir',
      role: 'CASHIER',
    },
  });
  console.log('✅ Kassir user created:', kassir.login);

  // Create sample products
  const products = [
    {
      name: 'PET Preform 28mm',
      bagType: 'Katta qop',
      unitsPerBag: 1000,
      minStockLimit: 50,
      optimalStock: 200,
      maxCapacity: 500,
      currentStock: 150,
      currentUnits: 150000, // 150 qop * 1000 dona
      pricePerBag: 250000,
      productionCost: 200000,
    },
    {
      name: 'PET Preform 38mm',
      bagType: 'O\'rta qop',
      unitsPerBag: 800,
      minStockLimit: 40,
      optimalStock: 150,
      maxCapacity: 400,
      currentStock: 80,
      currentUnits: 64000, // 80 qop * 800 dona
      pricePerBag: 300000,
      productionCost: 240000,
    },
    {
      name: 'PET Preform 48mm',
      bagType: 'Kichik qop',
      unitsPerBag: 600,
      minStockLimit: 30,
      optimalStock: 100,
      maxCapacity: 300,
      currentStock: 45,
      currentUnits: 27000, // 45 qop * 600 dona
      pricePerBag: 350000,
      productionCost: 280000,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { name: product.name },
      update: {},
      create: product,
    });
  }
  console.log('✅ Sample products created');

  // Create sample customers
  const customers = [
    {
      name: 'Toshkent Savdo',
      email: 'toshkent@example.com',
      phone: '+998901234567',
      category: 'VIP' as const,
      balance: 5000000,
      debt: 0,
    },
    {
      name: 'Samarqand Distribyutor',
      email: 'samarqand@example.com',
      phone: '+998901234568',
      category: 'NORMAL' as const,
      balance: 2000000,
      debt: 500000,
    },
  ];

  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { email: customer.email },
      update: {},
      create: customer,
    });
  }
  console.log('✅ Sample customers created');

  // Create default system settings
  const defaultSettings = [
    { key: 'USD_TO_UZS_RATE', value: '12500', description: 'USD to UZS exchange rate' },
    { key: 'EUR_TO_UZS_RATE', value: '13500', description: 'EUR to UZS exchange rate' },
    { key: 'COMPANY_NAME', value: 'Lux Pet Plast', description: 'Company name' },
    { key: 'COMPANY_ADDRESS', value: 'Toshkent, O\'zbekiston', description: 'Company address' },
    { key: 'COMPANY_PHONE', value: '+998901234567', description: 'Company phone' },
    { key: 'COMPANY_EMAIL', value: 'info@luxpetplast.uz', description: 'Company email' },
    { key: 'TAX_RATE', value: '12', description: 'VAT tax rate percentage' },
    { key: 'INVOICE_PREFIX', value: 'INV', description: 'Invoice number prefix' },
    { key: 'LOW_STOCK_THRESHOLD', value: '10', description: 'Low stock alert threshold' },
    { key: 'DEBT_ALERT_DAYS', value: '30', description: 'Debt alert days' },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        ...setting,
        updatedBy: admin.id,
      },
    });
  }
  console.log('✅ Default system settings created');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
