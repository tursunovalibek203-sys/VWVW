import { prisma } from './utils/prisma';

async function main() {
  // 1. Add Test Exchange Rate (for USD <-> UZS conversions)
  const existingRate = await prisma.exchangeRate.findFirst({
    where: { fromCurrency: 'USD', toCurrency: 'UZS', isActive: true }
  });
  if (!existingRate) {
    await prisma.exchangeRate.create({
      data: {
        fromCurrency: 'USD',
        toCurrency: 'UZS',
        rate: 12500,
        isActive: true
      }
    });
    console.log('✅ Valyuta kursi qo\'shildi: 1 USD = 12,500 UZS');
  } else {
    console.log('ℹ️ Valyuta kursi allaqachon mavjud');
  }

  // 2. Add Realistic Lux Pet Plast Products (Preforms, Caps, Handles)
  const testProducts = [
    // Preform Products
    {
      name: 'Preform 15 gr - Oq',
      color: 'Oq',
      bagType: 'SMALL',
      unitsPerBag: 2000,
      minStockLimit: 20,
      optimalStock: 100,
      maxCapacity: 300,
      currentStock: 50,
      currentUnits: 50 * 2000,
      pricePerBag: 150000,
      pricePerPiece: 75,
      warehouse: 'preform',
      active: true
    },
    {
      name: 'Preform 21 gr - Ko\'k',
      color: 'Ko\'k',
      bagType: 'SMALL',
      unitsPerBag: 2000,
      minStockLimit: 15,
      optimalStock: 80,
      maxCapacity: 250,
      currentStock: 30,
      currentUnits: 30 * 2000,
      pricePerBag: 180000,
      pricePerPiece: 90,
      warehouse: 'preform',
      active: true
    },
    {
      name: 'Preform 28 gr - Qora',
      color: 'Qora',
      bagType: 'MEDIUM',
      unitsPerBag: 1500,
      minStockLimit: 10,
      optimalStock: 60,
      maxCapacity: 200,
      currentStock: 25,
      currentUnits: 25 * 1500,
      pricePerBag: 220000,
      pricePerPiece: 147,
      warehouse: 'preform',
      active: true
    },
    // Cap Products
    {
      name: 'Qopqoq 28 mm - Oq',
      color: 'Oq',
      bagType: 'SMALL',
      unitsPerBag: 5000,
      minStockLimit: 25,
      optimalStock: 150,
      maxCapacity: 400,
      currentStock: 100,
      currentUnits: 100 * 5000,
      pricePerBag: 80000,
      pricePerPiece: 16,
      warehouse: 'krishka',
      active: true
    },
    {
      name: 'Qopqoq 48 mm - Qora',
      color: 'Qora',
      bagType: 'MEDIUM',
      unitsPerBag: 3000,
      minStockLimit: 15,
      optimalStock: 100,
      maxCapacity: 300,
      currentStock: 40,
      currentUnits: 40 * 3000,
      pricePerBag: 95000,
      pricePerPiece: 32,
      warehouse: 'krishka',
      active: true
    },
    // Handle Products
    {
      name: 'Ruchka 38 mm - Oq',
      color: 'Oq',
      bagType: 'SMALL',
      unitsPerBag: 4000,
      minStockLimit: 15,
      optimalStock: 90,
      maxCapacity: 250,
      currentStock: 60,
      currentUnits: 60 * 4000,
      pricePerBag: 60000,
      pricePerPiece: 15,
      warehouse: 'ruchka',
      active: true
    },
    // Legacy test products (optional, kept for compatibility)
    {
      name: 'Test Maxsulot',
      color: null,
      bagType: 'SMALL',
      unitsPerBag: 1000,
      minStockLimit: 5,
      optimalStock: 20,
      maxCapacity: 50,
      currentStock: 0,
      currentUnits: 0,
      pricePerBag: 5000,
      warehouse: 'preform',
      active: true
    }
  ];

  for (const product of testProducts) {
    const exists = await prisma.product.findFirst({ where: { name: product.name } });
    if (!exists) {
      const created = await prisma.product.create({ 
        data: product
      });
      console.log(`✅ Mahsulot qo'shildi: ${product.name}`);
      // Also add stock movement for initial stock
      if (product.currentStock > 0) {
        await prisma.stockMovement.create({
          data: {
            productId: created.id,
            type: 'ADD',
            quantity: product.currentStock,
            units: product.currentUnits || 0,
            reason: 'Boshlang\'ich zaxira',
            userId: 'system',
            userName: 'System',
            previousStock: 0,
            previousUnits: 0,
            newStock: product.currentStock,
            newUnits: product.currentUnits || 0,
            notes: 'Test maqsadlarida qo\'shildi'
          }
        });
        console.log(`  📦 Stock Movement yaratildi: +${product.currentStock} qop`);
      }
    } else {
      console.log(`ℹ️ Mahsulot allaqachon mavjud: ${product.name}`);
    }
  }

  // 3. Add Test Customer
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
    console.log(`✅ Mijoz qo'shildi: ${testCustomer.name}`);
  } else {
    console.log(`ℹ️ Mijoz allaqachon mavjud: ${testCustomer.name}`);
  }

  // 4. Add Test Employee for Loans
  const testEmployee = {
    employeeCode: 'EMP-001',
    firstName: 'Test',
    lastName: 'Xodim',
    fullName: 'Test Xodim',
    phone: '+998901234567',
    email: 'test@luxpetplast.uz',
    departmentId: null, // Optional
    positionId: null, // Optional
    hireDate: new Date(),
    employmentType: 'FULL_TIME' as const,
    workSchedule: 'STANDARD' as const,
    status: 'ACTIVE' as const,
    salary: 3000000,
    active: true
  };
  // Check if employee exists (safe check, since model may vary)
  try {
    const empExists = await prisma.employee.findFirst({
      where: { phone: testEmployee.phone }
    });
    if (!empExists) {
      await prisma.employee.create({ data: testEmployee });
      console.log('✅ Xodim qo\'shildi');
    } else {
      console.log('ℹ️ Xodim allaqachon mavjud');
    }
  } catch {
    console.log('ℹ️ Employee model tekshirilmoqda (hech qanday xato emas)');
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
