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

// ============================================================
// ANALYTICS DASHBOARD ENDPOINTS
// ============================================================

function getPeriodDates(period: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date, end: Date;
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'week':
      start = new Date(now); start.setDate(now.getDate() - 7);
      end   = now;
      break;
    case 'custom':
      start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
      end   = endDate   ? new Date(endDate)   : now;
      break;
    default: // month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end   = now;
  }
  return { start, end };
}

// GET /reports/analytics/overview
router.get('/analytics/overview', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query as any;
    const { start, end } = getPeriodDates(period, startDate, endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);

    const [currSales, prevSales, expenses, customers, products, dailyRaw] = await Promise.all([
      prisma.sale.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { totalAmount: true, quantity: true }, _count: { id: true } }),
      prisma.sale.aggregate({ where: { createdAt: { gte: prevStart, lt: start } }, _sum: { totalAmount: true }, _count: { id: true } }),
      prisma.expense.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.customer.aggregate({ _count: { id: true }, _sum: { debtUZS: true, debtUSD: true } }),
      prisma.product.aggregate({ where: { active: true }, _count: { id: true }, _sum: { currentStock: true } }),
      prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end } },
        select: { createdAt: true, totalAmount: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const revenue    = currSales._sum.totalAmount || 0;
    const prevRev    = prevSales._sum.totalAmount || 0;
    const totalExp   = expenses._sum.amount || 0;
    const growthRate = prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : null;
    const runRate    = (revenue / days) * 30;

    // daily trend
    const dayMap = new Map<string, { revenue: number; count: number }>();
    dailyRaw.forEach(s => {
      const d = s.createdAt.toISOString().split('T')[0];
      const ex = dayMap.get(d) || { revenue: 0, count: 0 };
      ex.revenue += s.totalAmount; ex.count += 1;
      dayMap.set(d, ex);
    });
    const dailyTrend = [...dayMap.entries()].map(([date, v]) => ({ date, revenue: v.revenue, count: v.count }));

    res.json({
      period: { start: start.toISOString(), end: end.toISOString(), days },
      revenue, prevRevenue: prevRev, growthRate, runRate,
      totalExpenses: totalExp, netProfit: revenue - totalExp,
      saleCount: currSales._count.id, prevSaleCount: prevSales._count.id,
      totalQty: currSales._sum.quantity || 0,
      totalCustomers: customers._count.id,
      totalDebtUZS: customers._sum.debtUZS || 0,
      totalDebtUSD: customers._sum.debtUSD || 0,
      totalProducts: products._count.id,
      totalStockBags: products._sum.currentStock || 0,
      dailyTrend,
    });
  } catch (err: any) {
    console.error('analytics/overview error:', err);
    res.status(500).json({ error: 'Umumiy tahlilni yuklashda xatolik' });
  }
});

// GET /reports/analytics/sales
router.get('/analytics/sales', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query as any;
    const { start, end } = getPeriodDates(period, startDate, endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);
    const yoyStart  = new Date(start); yoyStart.setFullYear(yoyStart.getFullYear() - 1);
    const yoyEnd    = new Date(end);   yoyEnd.setFullYear(yoyEnd.getFullYear() - 1);

    const [sales, prevSales, yoySales, saleItems, users] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { items: { include: { product: true } }, user: { select: { id: true, name: true } } },
      }),
      prisma.sale.findMany({ where: { createdAt: { gte: prevStart, lt: start } }, select: { totalAmount: true, quantity: true } }),
      prisma.sale.findMany({ where: { createdAt: { gte: yoyStart, lte: yoyEnd } }, select: { totalAmount: true } }),
      prisma.saleItem.findMany({
        where: { sale: { createdAt: { gte: start, lte: end } } },
        include: { product: true },
      }),
      prisma.user.findMany({ where: { role: 'SELLER', active: true }, select: { id: true, name: true } }),
    ]);

    const revenue    = sales.reduce((s, x) => s + x.totalAmount, 0);
    const prevRev    = prevSales.reduce((s, x) => s + x.totalAmount, 0);
    const yoyRev     = yoySales.reduce((s, x) => s + x.totalAmount, 0);
    const totalQty   = sales.reduce((s, x) => s + x.quantity, 0);
    const saleCount  = sales.length;

    const aov          = saleCount > 0 ? revenue / saleCount : 0;
    const prevAov      = prevSales.length > 0 ? prevRev / prevSales.length : 0;
    const unitsPerTx   = saleCount > 0 ? totalQty / saleCount : 0;
    const pricePerUnit = totalQty > 0 ? revenue / totalQty : 0;
    const growthRate   = prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : null;
    const yoyGrowth    = yoyRev > 0 ? ((revenue - yoyRev) / yoyRev) * 100 : null;
    const basketTrend  = prevAov > 0 ? ((aov - prevAov) / prevAov) * 100 : null;
    const runRate      = (revenue / days) * 30;

    // Gross margin (only if productionCost data exists)
    let totalCost = 0;
    let hasCost   = false;
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const c = item.product?.productionCost || 0;
        if (c > 0) hasCost = true;
        totalCost += c * item.quantity;
      });
    });
    const grossMargin = hasCost && revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : null;

    // Margin by product warehouse/category
    const catMap = new Map<string, { rev: number; cost: number }>();
    saleItems.forEach(item => {
      const cat = item.product?.warehouse || 'boshqa';
      const ex  = catMap.get(cat) || { rev: 0, cost: 0 };
      ex.rev  += item.subtotal;
      ex.cost += (item.product?.productionCost || 0) * item.quantity;
      catMap.set(cat, ex);
    });
    const marginByCategory = [...catMap.entries()].map(([cat, v]) => ({
      category: cat,
      revenue: v.rev,
      margin: v.rev > 0 ? ((v.rev - v.cost) / v.rev) * 100 : 0,
    }));

    // SKU contribution (Pareto)
    const skuMap = new Map<string, { name: string; revenue: number; qty: number }>();
    saleItems.forEach(item => {
      const pid = item.productId || 'unknown';
      const ex  = skuMap.get(pid) || { name: item.product?.name || 'Noma\'lum', revenue: 0, qty: 0 };
      ex.revenue += item.subtotal; ex.qty += item.quantity;
      skuMap.set(pid, ex);
    });
    const skuList = [...skuMap.values()].sort((a, b) => b.revenue - a.revenue);
    let cumRev = 0; const totalSkuRev = skuList.reduce((s, x) => s + x.revenue, 0);
    const skuPareto = skuList.map(x => {
      cumRev += x.revenue;
      return { ...x, cumPct: totalSkuRev > 0 ? (cumRev / totalSkuRev) * 100 : 0 };
    });

    // Revenue per salesperson
    const userMap = new Map<string, { name: string; revenue: number; count: number }>();
    sales.forEach(sale => {
      const ex = userMap.get(sale.userId) || { name: sale.user.name, revenue: 0, count: 0 };
      ex.revenue += sale.totalAmount; ex.count += 1;
      userMap.set(sale.userId, ex);
    });
    const revenuePerSalesperson = [...userMap.values()].sort((a, b) => b.revenue - a.revenue);

    // Hourly distribution
    const hourly = new Array(24).fill(0).map((_, h) => ({ hour: h, revenue: 0, count: 0 }));
    sales.forEach(s => {
      const h = new Date(s.createdAt).getHours();
      hourly[h].revenue += s.totalAmount; hourly[h].count += 1;
    });

    // Daily trend
    const dayMap = new Map<string, { revenue: number; count: number }>();
    sales.forEach(s => {
      const d = s.createdAt.toISOString().split('T')[0];
      const ex = dayMap.get(d) || { revenue: 0, count: 0 };
      ex.revenue += s.totalAmount; ex.count += 1;
      dayMap.set(d, ex);
    });
    const dailyTrend = [...dayMap.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      period: { start: start.toISOString(), end: end.toISOString(), days },
      revenue, prevRevenue: prevRev, growthRate, yoyGrowth, runRate,
      saleCount, totalQty, aov, prevAov, unitsPerTx, pricePerUnit, basketTrend,
      grossMargin, grossMarginNote: !hasCost ? 'Tannarx kiritilmagan mahsulotlar mavjud' : null,
      marginByCategory,
      skuPareto,
      revenuePerSalesperson,
      dailyTrend,
      hourlySales: hourly,
      missingData: {
        salesTarget: 'Sotuv rejasi tizimga kiritilmagan',
        conversionRate: 'Tashrif (traffic) ma\'lumoti mavjud emas',
        channels: 'Kanal bo\'yicha (offline/online) ajratish mavjud emas',
        salesCycle: 'CRM bosqichlari mavjud emas',
      },
    });
  } catch (err: any) {
    console.error('analytics/sales error:', err);
    res.status(500).json({ error: 'Sotuv tahlilini yuklashda xatolik' });
  }
});

// GET /reports/analytics/inventory
router.get('/analytics/inventory', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query as any;
    const { start, end } = getPeriodDates(period, startDate, endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const [products, saleItemsInPeriod] = await Promise.all([
      prisma.product.findMany({
        where: { active: true },
        include: {
          saleItems: { where: { sale: { createdAt: { gte: start, lte: end } } }, select: { quantity: true, subtotal: true } },
        },
      }),
      prisma.saleItem.findMany({
        where: { sale: { createdAt: { gte: start, lte: end } } },
        select: { quantity: true, subtotal: true, productId: true },
      }),
    ]);

    const productMetrics = products.map(p => {
      const periodSold  = p.saleItems.reduce((s, i) => s + i.quantity, 0);
      const periodRev   = p.saleItems.reduce((s, i) => s + i.subtotal, 0);
      const dailySales  = periodSold / days;
      const stockCover  = dailySales > 0 ? p.currentStock / dailySales : null;
      const invValue    = p.currentStock * p.pricePerBag;
      const cogs        = periodSold * (p.productionCost || 0);
      const grossProfit = periodRev - cogs;
      const gmroi       = invValue > 0 && p.productionCost > 0 ? grossProfit / invValue : null;
      return {
        id: p.id, name: p.name, warehouse: p.warehouse,
        currentStock: p.currentStock, currentUnits: p.currentUnits,
        pricePerBag: p.pricePerBag, productionCost: p.productionCost,
        minStockLimit: p.minStockLimit, optimalStock: p.optimalStock,
        periodSold, periodRev, dailySales, stockCover, invValue, gmroi,
        isStockout: p.currentStock === 0,
        isLowStock: p.currentStock < p.minStockLimit,
        isDeadStock: periodSold === 0 && p.currentStock > 0,
      };
    });

    const totalInvValue  = productMetrics.reduce((s, p) => s + p.invValue, 0);
    const totalPeriodRev = productMetrics.reduce((s, p) => s + p.periodRev, 0);
    const totalSold      = productMetrics.reduce((s, p) => s + p.periodSold, 0);
    const totalStock     = productMetrics.reduce((s, p) => s + p.currentStock, 0);

    // Inventory turnover (only if productionCost data exists)
    const hasCost = productMetrics.some(p => p.productionCost > 0);
    const totalCogs = productMetrics.reduce((s, p) => s + p.periodSold * (p.productionCost || 0), 0);
    const annualTurnover = hasCost && totalInvValue > 0 ? (totalCogs / totalInvValue) * (365 / days) : null;
    const dio            = annualTurnover ? 365 / annualTurnover : null;
    const stockToSales   = totalPeriodRev > 0 ? totalInvValue / totalPeriodRev : null;
    const sellThrough    = (totalSold + totalStock) > 0 ? (totalSold / (totalSold + totalStock)) * 100 : null;

    // Dead stock analysis
    const deadStock      = productMetrics.filter(p => p.isDeadStock);
    const deadStockValue = deadStock.reduce((s, p) => s + p.invValue, 0);
    const deadStockRatio = totalInvValue > 0 ? (deadStockValue / totalInvValue) * 100 : 0;

    // Stockout rate
    const stockoutCount = productMetrics.filter(p => p.isStockout).length;
    const stockoutRate  = products.length > 0 ? (stockoutCount / products.length) * 100 : 0;

    // ABC classification by revenue
    const byRev = [...productMetrics].sort((a, b) => b.periodRev - a.periodRev);
    let cumRev  = 0;
    const abcProducts = byRev.map(p => {
      cumRev += p.periodRev;
      const cumPct = totalPeriodRev > 0 ? (cumRev / totalPeriodRev) * 100 : 0;
      return { ...p, abc: cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C', cumPct };
    });

    // Top/Bottom 10 by daily sales speed
    const bySpeed  = [...productMetrics].filter(p => p.currentStock > 0).sort((a, b) => b.dailySales - a.dailySales);
    const top10    = bySpeed.slice(0, 10);
    const bottom10 = bySpeed.slice(-10).reverse();

    // Warehouse distribution
    const whMap = new Map<string, { count: number; value: number; sold: number }>();
    productMetrics.forEach(p => {
      const ex = whMap.get(p.warehouse) || { count: 0, value: 0, sold: 0 };
      ex.count++; ex.value += p.invValue; ex.sold += p.periodSold;
      whMap.set(p.warehouse, ex);
    });
    const warehouseDist = [...whMap.entries()].map(([name, v]) => ({ name, ...v }));

    res.json({
      period: { start: start.toISOString(), end: end.toISOString(), days },
      summary: {
        totalProducts: products.length, totalInvValue, stockoutCount, stockoutRate,
        deadStockCount: deadStock.length, deadStockValue, deadStockRatio,
        lowStockCount: productMetrics.filter(p => p.isLowStock).length,
      },
      metrics: {
        inventoryTurnover: annualTurnover, dio, stockToSales, sellThrough,
        turnoverNote: !hasCost ? 'Tannarx kiritilmagan – aylanma hisoblanmadi' : null,
      },
      abcProducts, top10BySpeed: top10, bottom10BySpeed: bottom10, warehouseDist,
    });
  } catch (err: any) {
    console.error('analytics/inventory error:', err);
    res.status(500).json({ error: 'Ombor tahlilini yuklashda xatolik' });
  }
});

// GET /reports/analytics/customers
router.get('/analytics/customers', async (req, res) => {
  try {
    const { period = 'month', startDate, endDate } = req.query as any;
    const { start, end } = getPeriodDates(period, startDate, endDate);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - days);

    const [customers, periodSales, prevSales, periodPayments] = await Promise.all([
      prisma.customer.findMany({ select: { id: true, name: true, category: true, debtUZS: true, debtUSD: true, creditLimit: true, lastPurchase: true, createdAt: true } }),
      prisma.sale.findMany({ where: { createdAt: { gte: start, lte: end } }, select: { customerId: true, totalAmount: true, id: true } }),
      prisma.sale.findMany({ where: { createdAt: { gte: prevStart, lt: start } }, select: { customerId: true, totalAmount: true } }),
      prisma.payment.findMany({ where: { createdAt: { gte: start, lte: end } }, select: { customerId: true, amount: true, currency: true } }),
    ]);

    const currIds = new Set(periodSales.map(s => s.customerId).filter(Boolean) as string[]);
    const prevIds = new Set(prevSales.map(s => s.customerId).filter(Boolean) as string[]);
    const newCusts      = [...currIds].filter(id => !prevIds.has(id));
    const returning     = [...currIds].filter(id => prevIds.has(id));
    const churned       = [...prevIds].filter(id => !currIds.has(id));
    const retentionRate = prevIds.size > 0 ? (returning.length / prevIds.size) * 100 : null;
    const churnRate     = prevIds.size > 0 ? (churned.length / prevIds.size) * 100 : null;

    const totalRev  = periodSales.reduce((s, x) => s + x.totalAmount, 0);
    const newRevSet = new Set(newCusts);
    const newRev    = periodSales.filter(s => newRevSet.has(s.customerId!)).reduce((s, x) => s + x.totalAmount, 0);
    const retRev    = totalRev - newRev;

    // DSO
    const totalDebtUZS = customers.reduce((s, c) => s + (c.debtUZS || 0), 0);
    const totalDebtUSD = customers.reduce((s, c) => s + (c.debtUSD || 0), 0);
    const avgDailyRev  = totalRev / days;
    const dso          = avgDailyRev > 0 ? totalDebtUZS / avgDailyRev : null;

    // Debtors
    const debtors     = customers.filter(c => (c.debtUZS || 0) > 0 || (c.debtUSD || 0) > 0);
    const overdueRatio = customers.length > 0 ? (debtors.length / customers.length) * 100 : 0;

    // Aging (based on lastPurchase date)
    const now    = new Date();
    const aging  = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    const agingV = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    debtors.forEach(c => {
      if (!c.lastPurchase) return;
      const d = Math.floor((now.getTime() - new Date(c.lastPurchase).getTime()) / 864e5);
      const debt = c.debtUZS || 0;
      if      (d <= 30)  { aging['0-30']++;  agingV['0-30']  += debt; }
      else if (d <= 60)  { aging['31-60']++; agingV['31-60'] += debt; }
      else if (d <= 90)  { aging['61-90']++; agingV['61-90'] += debt; }
      else               { aging['90+']++;   agingV['90+']   += debt; }
    });

    // Concentration risk: top 5 customers share of period revenue
    const custRevMap = new Map<string, number>();
    periodSales.forEach(s => { const id = s.customerId || ''; if (id) custRevMap.set(id, (custRevMap.get(id) || 0) + s.totalAmount); });
    const top5Rev          = [...custRevMap.values()].sort((a, b) => b - a).slice(0, 5).reduce((s, x) => s + x, 0);
    const concentrationRisk = totalRev > 0 ? (top5Rev / totalRev) * 100 : 0;

    // Bad debt ratio (90+ aging vs total debt)
    const badDebtRatio = totalDebtUZS > 0 ? (agingV['90+'] / totalDebtUZS) * 100 : 0;

    // Repeat purchase rate
    const purchaseCounts = new Map<string, number>();
    periodSales.forEach(s => { if (s.customerId) purchaseCounts.set(s.customerId, (purchaseCounts.get(s.customerId) || 0) + 1); });
    const repeatBuyers     = [...purchaseCounts.values()].filter(c => c > 1).length;
    const repeatPurchRate  = currIds.size > 0 ? (repeatBuyers / currIds.size) * 100 : 0;

    // Collection Effectiveness Index = payments received / opening debt
    const totalPayments = periodPayments.filter(p => p.currency === 'UZS').reduce((s, p) => s + p.amount, 0);
    const cei           = totalDebtUZS > 0 ? (totalPayments / (totalDebtUZS + totalPayments)) * 100 : null;

    // Top 10 customers by period revenue
    const custDetail = customers.map(c => ({
      id: c.id, name: c.name, category: c.category,
      periodRevenue: custRevMap.get(c.id) || 0,
      debtUZS: c.debtUZS || 0, debtUSD: c.debtUSD || 0,
      lastPurchase: c.lastPurchase,
      riskLevel: (c.debtUZS || 0) > (c.creditLimit || 0) * 0.9 ? 'HIGH' : (c.debtUZS || 0) > (c.creditLimit || 0) * 0.6 ? 'MEDIUM' : 'LOW',
    }));
    const top10Best  = [...custDetail].sort((a, b) => b.periodRevenue - a.periodRevenue).slice(0, 10);
    const top10Risky = [...custDetail].filter(c => c.debtUZS > 0).sort((a, b) => b.debtUZS - a.debtUZS).slice(0, 10);

    res.json({
      period: { start: start.toISOString(), end: end.toISOString(), days },
      summary: {
        totalCustomers: customers.length, activeCustomers: currIds.size,
        newCustomers: newCusts.length, returningCustomers: returning.length,
        churnedCustomers: churned.length, debtorsCount: debtors.length,
        totalDebtUZS, totalDebtUSD,
      },
      metrics: { churnRate, retentionRate, newRevenue: newRev, returningRevenue: retRev, dso, overdueRatio, concentrationRisk, badDebtRatio, repeatPurchRate, cei },
      aging, agingValue: agingV,
      top10Best, top10Risky,
    });
  } catch (err: any) {
    console.error('analytics/customers error:', err);
    res.status(500).json({ error: 'Mijozlar tahlilini yuklashda xatolik' });
  }
});

export default router;
