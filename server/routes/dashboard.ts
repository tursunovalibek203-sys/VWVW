import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/stats', async (req, res) => {
  try {
    const now   = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);

    // Davr chegaralari
    const monthStart    = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart= new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd  = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const yesterday     = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo       = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

    // ── Barcha so'rovlar parallel ──────────────────────────────────────────────
    const [
      // Bugun
      todaySalesAgg,
      todaySalesCount,
      todayExpenses,
      todayBatches,

      // Bu oy
      monthSalesUZS,
      monthSalesUSD,
      monthExpenses,

      // O'tgan oy (trend uchun)
      lastMonthSalesUZS,
      lastMonthSalesUSD,
      lastMonthExpenses,

      // Kecha (kunlik trend uchun)
      yesterdaySalesAgg,

      // Ombor
      totalProducts,
      lowStockRaw,

      // Buyurtmalar
      activeProduction,
      pendingDeliveries,
      pendingTasks,

      // Top mahsulotlar
      topProductsRaw,

      // Oxirgi sotuvlar (so'nggi faoliyat)
      recentSales,

      // Kassa
      cashboxTxns,
    ] = await Promise.all([
      // Bugungi sotuv jami (paidAmount va totalAmount)
      prisma.sale.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: { id: true },
      }),

      // Bugungi sotuv soni
      prisma.sale.count({ where: { createdAt: { gte: today } } }),

      // Bugungi xarajatlar
      prisma.expense.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { amount: true },
      }),

      // Bugungi ishlab chiqarish (Batch)
      prisma.batch.aggregate({
        where: { productionDate: { gte: today } },
        _sum: { quantity: true },
        _count: { id: true },
      }),

      // Bu oy sotuv UZS
      prisma.sale.aggregate({
        where: { createdAt: { gte: monthStart }, currency: 'UZS' },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // Bu oy sotuv USD
      prisma.sale.aggregate({
        where: { createdAt: { gte: monthStart }, currency: 'USD' },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // Bu oy xarajatlar
      prisma.expense.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),

      // O'tgan oy UZS
      prisma.sale.aggregate({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, currency: 'UZS' },
        _sum: { totalAmount: true },
      }),

      // O'tgan oy USD
      prisma.sale.aggregate({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd }, currency: 'USD' },
        _sum: { totalAmount: true },
      }),

      // O'tgan oy xarajatlar
      prisma.expense.aggregate({
        where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),

      // Kecha sotuv
      prisma.sale.aggregate({
        where: { createdAt: { gte: yesterday, lt: today } },
        _sum: { totalAmount: true, paidAmount: true },
      }),

      // Mahsulotlar soni
      prisma.product.count({ where: { active: true } }),

      // Kam qolgan mahsulotlar (cross-column — raw SQL kerak)
      prisma.$queryRaw<Array<{ id: string; name: string; currentStock: number; minStockLimit: number }>>`
        SELECT id, name, currentStock, minStockLimit
        FROM "Product"
        WHERE currentStock <= minStockLimit AND active = 1
        ORDER BY currentStock ASC
        LIMIT 10
      `,

      // Aktiv ishlab chiqarish
      prisma.productionOrder.count({ where: { status: 'IN_PROGRESS' } }),

      // Kutilayotgan yetkazmalar
      prisma.deliveryNew.count({ where: { status: 'PENDING' } }),

      // Kutilayotgan vazifalar
      prisma.task.count({ where: { status: 'TODO' } }),

      // Top 5 mahsulot (bu oy)
      prisma.saleItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, subtotal: true },
        where: { sale: { createdAt: { gte: monthStart } }, productId: { not: null } },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 5,
      }),

      // Oxirgi 5 sotuv
      prisma.sale.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          receiptNumber: true,
          createdAt: true,
          totalAmount: true,
          paidAmount: true,
          currency: true,
          paymentStatus: true,
          manualCustomerName: true,
          customer: { select: { name: true } },
          user:     { select: { name: true } },
          items: {
            take: 1,
            select: { product: { select: { name: true } } },
          },
        },
      }),

      // Kassa balansi (oxirgi 2000 tranzaksiya)
      prisma.cashboxTransaction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2000,
        select: { type: true, amount: true, currency: true },
      }),
    ]);

    // ── Mijozlar (raw SQL — telegramTopicId DB da yo'q) ────────────────────────
    const [debtRaw, customerCountRaw, topCustomersRaw] = await Promise.all([
      prisma.$queryRaw<[{ debtUZS: number; debtUSD: number; cnt: bigint }]>`
        SELECT
          COALESCE(SUM(debtUZS), 0) as debtUZS,
          COALESCE(SUM(debtUSD), 0) as debtUSD,
          COUNT(*) as cnt
        FROM "Customer"
      `,
      prisma.$queryRaw<[{ cnt: bigint }]>`SELECT COUNT(*) as cnt FROM "Customer"`,
      prisma.$queryRaw<Array<{ id: string; name: string; debtUSD: number; debtUZS: number }>>`
        SELECT id, name, debtUSD, debtUZS
        FROM "Customer"
        WHERE debtUSD > 0 OR debtUZS > 0
        ORDER BY debtUSD DESC
        LIMIT 5
      `,
    ]);

    // ── Kassa balansi hisoblash ────────────────────────────────────────────────
    const cashBalanceUZS = cashboxTxns
      .filter(t => t.currency === 'UZS' || !t.currency)
      .reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0);
    const cashBalanceUSD = cashboxTxns
      .filter(t => t.currency === 'USD')
      .reduce((sum, t) => sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0);

    // ── Bugungi hisoblash ─────────────────────────────────────────────────────
    const todayTotal   = todaySalesAgg._sum.totalAmount ?? 0;
    const todayPaid    = todaySalesAgg._sum.paidAmount  ?? 0;
    const todayDebt    = Math.max(0, todayTotal - todayPaid);
    const todayExpAmt  = todayExpenses._sum.amount ?? 0;
    const todayProfit  = todayPaid - todayExpAmt;
    const todayProduced= todayBatches._sum.quantity ?? 0;

    // ── Bu oy hisoblash ───────────────────────────────────────────────────────
    const monthRevenueUZS = monthSalesUZS._sum.totalAmount ?? 0;
    const monthRevenueUSD = monthSalesUSD._sum.totalAmount ?? 0;
    const monthPaidUZS    = monthSalesUZS._sum.paidAmount  ?? 0;
    const monthExpAmt     = monthExpenses._sum.amount ?? 0;
    const monthGrossProfit= monthRevenueUZS - monthExpAmt;

    // ── O'tgan oy hisoblash ───────────────────────────────────────────────────
    const lastMonthRevenueUZS = lastMonthSalesUZS._sum.totalAmount ?? 0;
    const lastMonthRevenueUSD = lastMonthSalesUSD._sum.totalAmount ?? 0;
    const lastMonthExpAmt     = lastMonthExpenses._sum.amount ?? 0;
    const lastMonthProfit     = lastMonthRevenueUZS - lastMonthExpAmt;

    // ── Real trend % hisoblash (bu oy vs o'tgan oy) ───────────────────────────
    const calcTrend = (curr: number, prev: number): number => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round(((curr - prev) / Math.abs(prev)) * 100);
    };

    const monthlyTrend = calcTrend(monthRevenueUZS, lastMonthRevenueUZS);
    const profitTrend  = calcTrend(monthGrossProfit, lastMonthProfit);

    // Kunlik trend (bugun vs kecha)
    const yesterdayTotal = yesterdaySalesAgg._sum.totalAmount ?? 0;
    const dailyTrend     = calcTrend(todayTotal, yesterdayTotal);

    // ── Haftalik grafik (so'nggi 7 kun) ──────────────────────────────────────
    const weeklyDataRaw = await prisma.$queryRaw<Array<{ day: string; sales: number }>>`
      SELECT
        DATE(createdAt) as day,
        COALESCE(SUM(totalAmount), 0) as sales
      FROM "Sale"
      WHERE createdAt >= ${weekAgo.toISOString()}
      GROUP BY DATE(createdAt)
      ORDER BY day ASC
    `;
    const weeklyExpRaw = await prisma.$queryRaw<Array<{ day: string; total: number }>>`
      SELECT
        DATE(createdAt) as day,
        COALESCE(SUM(amount), 0) as total
      FROM "Expense"
      WHERE createdAt >= ${weekAgo.toISOString()}
      GROUP BY DATE(createdAt)
    `;

    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const salesRow = weeklyDataRaw.find(r => r.day === dayStr);
      const expRow   = weeklyExpRaw.find(r => r.day === dayStr);
      const sales    = salesRow ? Number(salesRow.sales) : 0;
      const exp      = expRow   ? Number(expRow.total)   : 0;
      weeklyTrend.push({
        day:    d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
        date:   dayStr,
        sales,
        profit: sales - exp,
      });
    }

    // ── Top mahsulotlar (nom bilan) ───────────────────────────────────────────
    const productIds = topProductsRaw.map(p => p.productId).filter((id): id is string => id !== null);
    const productNames = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const prodNameMap = new Map(productNames.map(p => [p.id, p.name]));

    const topProducts = topProductsRaw.map(tp => ({
      id:       tp.productId,
      name:     prodNameMap.get(tp.productId ?? '') ?? 'Noma\'lum',
      totalSold: tp._sum.quantity    ?? 0,
      revenue:  tp._sum.subtotal ?? 0,
    }));

    // ── Oxirgi sotuvlar formatlash ────────────────────────────────────────────
    const recentActivity = recentSales.map(s => ({
      id:            s.id,
      receiptNumber: s.receiptNumber,
      createdAt:     s.createdAt,
      totalAmount:   s.totalAmount,
      paidAmount:    s.paidAmount,
      currency:      s.currency,
      paymentStatus: s.paymentStatus,
      customer:      s.customer?.name ?? s.manualCustomerName ?? 'Naqd mijoz',
      seller:        s.user?.name ?? '',
      product:       s.items[0]?.product?.name ?? '',
    }));

    // ── Javob ─────────────────────────────────────────────────────────────────
    res.json({
      // Bugun
      todaySales:       todaySalesCount,
      todayTotal,
      todayPaid,
      todayDebt,
      todayExpense:     todayExpAmt,
      todayProfit,
      todayProduced,

      // Kunlik trend (bugun vs kecha)
      dailyTrend,
      yesterdayTotal,

      // Bu oy
      monthlyRevenueUZS: monthRevenueUZS,
      monthlyRevenueUSD: monthRevenueUSD,
      monthlyPaidUZS:    monthPaidUZS,
      monthlyExpense:    monthExpAmt,
      monthlyProfit:     monthGrossProfit,
      monthlyTrend,

      // O'tgan oy
      lastMonthRevenueUZS,
      lastMonthRevenueUSD,
      lastMonthProfit,

      // Foyda trendi
      profitTrend,

      // Kassa
      cashBalanceUZS,
      cashBalanceUSD,
      cashBalance: cashBalanceUZS,

      // Mijozlar (raw SQL — telegramTopicId muammosi hal qilindi)
      totalCustomers:  Number(debtRaw[0]?.cnt ?? customerCountRaw[0]?.cnt ?? 0),
      totalDebtUZS:    Number(debtRaw[0]?.debtUZS ?? 0),
      totalDebtUSD:    Number(debtRaw[0]?.debtUSD ?? 0),
      topDebtors:      topCustomersRaw,

      // Ombor
      totalProducts,
      lowStock:        lowStockRaw,
      lowStockCount:   lowStockRaw.length,

      // Ishlab chiqarish
      activeProduction,
      todayBatchCount: todayBatches._count.id ?? 0,

      // Yetkazmalar & vazifalar
      pendingDeliveries,
      pendingTasks,

      // Haftalik grafik
      weeklyTrend,

      // Top mahsulotlar (bu oy)
      topProducts,

      // Top qarzdorlar
      topCustomers: topCustomersRaw,

      // Oxirgi 5 sotuv
      recentActivity,

      // Eski nomlar (frontendning eski qismlarini buzmaslik uchun)
      dailyRevenue:    todayTotal,
      dailyRevenueUZS: todayTotal,
      dailyRevenueUSD: 0,
      monthlyRevenue:  monthRevenueUZS,
      netProfit:       monthGrossProfit,
      totalExpenses:   monthExpAmt,
      totalDebt:       Number(debtRaw[0]?.debtUZS ?? 0),
      newCustomers:    0,
    });

  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({
      error:   'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
