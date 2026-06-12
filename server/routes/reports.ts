import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import fs from 'fs';
import path from 'path';
import { generateDailyExcelBackup } from '../utils/daily-excel-backup';
import { sendBufferToAdmins } from '../bot/admin-bot';

const router = Router();

router.use(authenticate);

router.get('/sales-summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: true,
        items: { include: { product: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
      averageSale: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.totalAmount, 0) / sales.length : 0,
      topProducts: await getTopProducts(where),
      salesByDay: await getSalesByDay(where),
    };

    res.json({ sales, summary });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        batches: { orderBy: { productionDate: 'desc' }, take: 5 },
        _count: { select: { saleItems: true } },
      },
    });

    const inventory = products.map((product) => ({
      ...product,
      totalValue: product.currentStock * product.pricePerBag,
      totalUnits: product.currentStock * product.unitsPerBag,
      status: getStockStatus(product),
    }));

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate inventory report' });
  }
});

router.get('/customer-analysis', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        sales: { include: { items: true } },
        payments: true,
      },
    });

    const analysis = customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      category: customer.category,
      totalPurchasesUZS: customer.sales.filter((s: any) => s.currency === 'UZS').reduce((sum: number, sale: any) => sum + sale.totalAmount, 0),
      totalPurchasesUSD: customer.sales.filter((s: any) => s.currency === 'USD').reduce((sum: number, sale: any) => sum + sale.totalAmount, 0),
      totalPurchases: customer.sales.reduce((sum: number, sale: any) => sum + sale.totalAmount, 0),
      totalPayments: customer.payments.reduce((sum: number, payment: any) => sum + payment.amount, 0),
      debt: (customer as any).debtUZS || customer.debt || 0,
      debtUZS: (customer as any).debtUZS || customer.debt || 0,
      debtUSD: (customer as any).debtUSD || 0,
      salesCount: customer.sales.length,
      lastPurchase: customer.lastPurchase,
      lastPayment: customer.lastPayment,
    }));

    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate customer analysis' });
  }
});

router.get('/profit-loss', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const [sales, expenses] = await Promise.all([
      prisma.sale.aggregate({ where, _sum: { totalAmount: true } }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    const revenue = sales._sum.totalAmount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const grossProfit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    res.json({
      revenue,
      expenses: totalExpenses,
      grossProfit,
      profitMargin: Math.round(profitMargin * 100) / 100,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate profit/loss report' });
  }
});

async function getTopProducts(where: any) {
  const items = await prisma.saleItem.findMany({
    where: { sale: where },
    include: { product: true },
  });

  const productMap = new Map();
  items.forEach((item) => {
    const existing = productMap.get(item.productId) || { quantity: 0, revenue: 0 };
    productMap.set(item.productId, {
      product: item.product,
      quantity: existing.quantity + item.quantity,
      revenue: existing.revenue + item.subtotal,
    });
  });

  return Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
}

async function getSalesByDay(where: any) {
  const sales = await prisma.sale.findMany({ where });
  const dayMap = new Map();

  sales.forEach((sale) => {
    const day = sale.createdAt.toISOString().split('T')[0];
    const existing = dayMap.get(day) || { count: 0, total: 0 };
    dayMap.set(day, {
      date: day,
      count: existing.count + 1,
      total: existing.total + sale.totalAmount,
    });
  });

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function getStockStatus(product: any) {
  if (product.currentStock === 0) return 'OUT_OF_STOCK';
  if (product.currentStock < product.minStockLimit) return 'CRITICAL';
  if (product.currentStock < product.optimalStock) return 'LOW';
  return 'GOOD';
}

// Sales report endpoint (for test compatibility)
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const sales = await prisma.sale.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        product: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const salesUZS = sales.filter((s: any) => s.currency === 'UZS');
    const salesUSD = sales.filter((s: any) => s.currency === 'USD');
    const totalRevenueUZS = salesUZS.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
    const totalRevenueUSD = salesUSD.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
    const totalRevenue = totalRevenueUZS;
    const totalQuantity = sales.reduce((sum: number, sale: any) => sum + sale.quantity, 0);

    res.json({
      sales,
      summary: {
        totalSales: sales.length,
        totalRevenue,
        totalRevenueUZS,
        totalRevenueUSD,
        totalQuantity,
        averageSale: salesUZS.length > 0 ? totalRevenueUZS / salesUZS.length : 0,
        averageSaleUSD: salesUSD.length > 0 ? totalRevenueUSD / salesUSD.length : 0,
      },
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Failed to generate sales report' });
  }
});

// Products report endpoint (for test compatibility)
router.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' },
    });

    const summary = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, p) => sum + (p.currentStock * p.pricePerBag), 0),
      totalUnits: products.reduce((sum, p) => sum + p.currentUnits, 0),
      lowStockCount: products.filter(p => p.currentStock < p.minStockLimit).length,
    };

    res.json({
      products,
      summary,
    });
  } catch (error) {
    console.error('Products report error:', error);
    res.status(500).json({ error: 'Failed to generate products report' });
  }
});

// Customers report endpoint (for test compatibility)
router.get('/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { name: 'asc' },
    });

    const summary = {
      totalCustomers: customers.length,
      vipCount: customers.filter(c => c.category === 'VIP').length,
      debtorsCount: customers.filter(c => (c.debtUZS || 0) + (c.debtUSD || 0) > 0).length,
      totalDebt: customers.reduce((sum, c) => sum + (c.debtUZS || 0) + (c.debtUSD || 0) * 12500, 0),
    };

    res.json({
      customers,
      summary,
    });
  } catch (error) {
    console.error('Customers report error:', error);
    res.status(500).json({ error: 'Failed to generate customers report' });
  }
});

// Daily Report - Morning and Evening
router.get('/daily', async (req, res) => {
  try {
    const { date, type } = req.query; // type: 'morning' | 'evening' | 'full'
    
    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const reportDate = new Date(date as string);
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Date filters
    const dayStart = new Date(reportDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(reportDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    // Morning report cutoff (9:00 AM)
    const morningCutoff = new Date(reportDate);
    morningCutoff.setHours(9, 0, 0, 0);
    
    // Evening report cutoff (18:00 PM)
    const eveningCutoff = new Date(reportDate);
    eveningCutoff.setHours(18, 0, 0, 0);

    let dateFilter: any = {
      gte: dayStart,
      lte: dayEnd
    };

    // Adjust filter based on report type
    if (type === 'morning') {
      dateFilter = { gte: dayStart, lte: morningCutoff };
    } else if (type === 'evening') {
      dateFilter = { gte: morningCutoff, lte: eveningCutoff };
    }

    // Fetch all daily data in parallel
    const [
      sales,
      orders,
      expenses,
      newCustomers,
      cashbox,
      products,
      payments
    ] = await Promise.all([
      // Sales data
      prisma.sale.findMany({
        where: { createdAt: dateFilter },
        include: { customer: true, items: { include: { product: true } } }
      }),
      
      // Orders data
      prisma.order.findMany({
        where: { 
          OR: [
            { createdAt: dateFilter },
            { status: { in: ['SOLD', 'DELIVERED'] }, updatedAt: dateFilter }
          ]
        },
        include: { customer: true, items: { include: { product: true } } }
      }),
      
      // Expenses
      prisma.expense.findMany({
        where: { createdAt: dateFilter }
      }),
      
      // New customers
      prisma.customer.findMany({
        where: { createdAt: dateFilter }
      }),
      
      // Cashbox state (model not available, using transactions instead)
      prisma.cashboxTransaction.findFirst({
        orderBy: { createdAt: 'desc' }
      }),
      
      // Products (for stock check)
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          currentStock: true,
          minStockLimit: true
        }
      }),
      
      // Payments received
      prisma.payment.findMany({
        where: { createdAt: dateFilter },
        include: { customer: true }
      })
    ]);

    // Calculate sales by currency
    const salesUZS = sales.filter((s: any) => s.currency === 'UZS');
    const salesUSD = sales.filter((s: any) => s.currency === 'USD');
    
    // Calculate totals
    const totalSalesUZS = salesUZS.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
    const totalSalesUSD = salesUSD.reduce((sum: number, s: any) => sum + s.totalAmount, 0);
    
    // Order statistics
    const soldOrders = orders.filter((o: any) => o.status === 'SOLD' || o.status === 'DELIVERED');
    const pendingOrders = orders.filter((o: any) => ['PENDING', 'CONFIRMED'].includes(o.status));
    
    // Calculate expenses
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
    
    // Calculate payments received
    const totalPaymentsUZS = payments
      .filter((p: any) => p.currency === 'UZS')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    const totalPaymentsUSD = payments
      .filter((p: any) => p.currency === 'USD')
      .reduce((sum: number, p: any) => sum + p.amount, 0);
    
    // Low stock products
    const lowStockProducts = products.filter((p: any) => p.currentStock < p.minStockLimit);
    
    // Customer debts
    const customersWithDebt = await prisma.customer.findMany({
      where: { 
        OR: [
          { debtUZS: { gt: 0 } },
          { debtUSD: { gt: 0 } }
        ]
      },
      select: {
        id: true,
        name: true,
        debtUZS: true,
        debtUSD: true
      }
    });
    
    const totalDebtUZS = customersWithDebt.reduce((sum: number, c: any) => sum + (c.debtUZS || 0), 0);
    const totalDebtUSD = customersWithDebt.reduce((sum: number, c: any) => sum + (c.debtUSD || 0), 0);

    const report = {
      date: date,
      type: type || 'full',
      
      // Sales Section
      sales: {
        totalCount: sales.length,
        totalUZS: totalSalesUZS,
        totalUSD: totalSalesUSD,
        byPaymentType: {
          cash: sales.filter((s: any) => s.paymentType === 'CASH').length,
          card: sales.filter((s: any) => s.paymentType === 'CARD').length,
          transfer: sales.filter((s: any) => s.paymentType === 'TRANSFER').length,
          debt: sales.filter((s: any) => s.paymentType === 'DEBT').length
        },
        topProducts: getTopProductsFromSales(sales)
      },
      
      // Orders Section
      orders: {
        total: orders.length,
        sold: soldOrders.length,
        pending: pendingOrders.length,
        inProduction: orders.filter((o: any) => o.status === 'IN_PRODUCTION').length,
        ready: orders.filter((o: any) => o.status === 'READY_FOR_DELIVERY').length,
        list: orders.map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customer: o.customer?.name,
          status: o.status,
          totalAmount: o.totalAmount,
          priority: o.priority
        }))
      },
      
      // Financial Section
      finance: {
        salesUZS: totalSalesUZS,
        salesUSD: totalSalesUSD,
        paymentsReceivedUZS: totalPaymentsUZS,
        paymentsReceivedUSD: totalPaymentsUSD,
        expenses: totalExpenses,
        customerDebtUZS: totalDebtUZS,
        customerDebtUSD: totalDebtUSD,
        cashboxBalance: null,
      },
      
      // Customers Section
      customers: {
        newCount: newCustomers.length,
        newList: newCustomers.map((c: any) => ({ id: c.id, name: c.name, phone: c.phone })),
        debtorsCount: customersWithDebt.length,
        debtorsList: customersWithDebt.map((c: any) => ({
          id: c.id,
          name: c.name,
          debtUZS: c.debtUZS || 0,
          debtUSD: c.debtUSD || 0
        }))
      },
      
      // Inventory Section
      inventory: {
        lowStockCount: lowStockProducts.length,
        lowStockProducts: lowStockProducts.map((p: any) => ({
          id: p.id,
          name: p.name,
          currentStock: p.currentStock,
          minLimit: p.minStockLimit
        })),
        totalProducts: products.length
      },
      
      // Expenses Section
      expenses: {
        total: totalExpenses,
        count: expenses.length,
        list: expenses.map((e: any) => ({
          id: e.id,
          amount: e.amount,
          category: e.category,
          description: e.description
        }))
      },
      
      // Summary
      summary: {
        netRevenueUZS: totalSalesUZS - totalExpenses,
        activeOrders: pendingOrders.length + orders.filter((o: any) => o.status === 'IN_PRODUCTION').length,
        completedOrders: soldOrders.length,
        totalTransactions: sales.length + orders.length + payments.length
      }
    };

    res.json(report);
  } catch (error) {
    console.error('Daily report error:', error);
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

// Helper function to get top products from sales
function getTopProductsFromSales(sales: any[]) {
  const productSales = new Map();
  
  sales.forEach(sale => {
    sale.items?.forEach((item: any) => {
      const existing = productSales.get(item.productId) || { 
        name: item.product?.name, 
        quantity: 0, 
        revenue: 0 
      };
      existing.quantity += item.quantity;
      existing.revenue += item.totalPrice || (item.quantity * item.pricePerUnit);
      productSales.set(item.productId, existing);
    });
  });
  
  return Array.from(productSales.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

// ── Excel fayl arxiv endpointlari ─────────────────────────────────────────────

const BACKUP_DIR = path.join(process.cwd(), 'backup', 'excel');

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// GET /reports/excel-files — barcha Excel backup fayllar ro'yxati
router.get('/excel-files', async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.xlsx'))
      .map(filename => {
        const filePath = path.join(BACKUP_DIR, filename);
        const stat = fs.statSync(filePath);
        const dateMatch = filename.match(/hisobot_(\d{4}-\d{2}-\d{2})/);
        return {
          filename,
          date: dateMatch ? dateMatch[1] : null,
          size: stat.size,
          sizeFormatted: formatFileSize(stat.size),
          createdAt: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    res.json({ files });
  } catch (error) {
    console.error('Excel files list error:', error);
    res.status(500).json({ error: 'Fayllar ro\'yxatini yuklashda xatolik' });
  }
});

// GET /reports/excel-files/download/:filename — faylni yuklab olish
router.get('/excel-files/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!/^hisobot_\d{4}-\d{2}-\d{2}\.xlsx$/.test(filename)) {
      return res.status(400).json({ error: 'Noto\'g\'ri fayl nomi' });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fayl topilmadi' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error('Excel download error:', error);
    res.status(500).json({ error: 'Faylni yuklashda xatolik' });
  }
});

// POST /reports/excel-files/generate-now — bugun uchun yangi hisobot yaratish
router.post('/excel-files/generate-now', async (req, res) => {
  try {
    const { buffer, filename } = await generateDailyExcelBackup();
    res.json({ ok: true, filename, size: buffer.length, sizeFormatted: formatFileSize(buffer.length) });
  } catch (error: any) {
    console.error('Generate Excel error:', error);
    res.status(500).json({ error: error.message || 'Hisobot yaratishda xatolik' });
  }
});

// POST /reports/excel-files/send-bot/:filename — faylni Telegram bot orqali yuborish
router.post('/excel-files/send-bot/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    if (!/^hisobot_\d{4}-\d{2}-\d{2}\.xlsx$/.test(filename)) {
      return res.status(400).json({ error: 'Noto\'g\'ri fayl nomi' });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Fayl topilmadi' });
    }
    const buffer = fs.readFileSync(filePath);
    await sendBufferToAdmins(buffer, filename, `📊 Admin saytidan yuborildi: *${filename}*`);
    res.json({ ok: true });
  } catch (error: any) {
    console.error('Send bot error:', error);
    res.status(500).json({ error: error.message || 'Yuborishda xatolik' });
  }
});

export default router;
