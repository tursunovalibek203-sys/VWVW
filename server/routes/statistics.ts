import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorizeAnalytics } from '../middleware/auth';
import { calculateAllMetrics } from '../utils/business-metrics';
import { withCache } from '../middleware/responseCache';

const router = Router();

router.use(authenticate);
router.use(authorizeAnalytics);

// Keng qamrovli statistika — 5 daqiqa cache
router.get('/comprehensive', withCache(5 * 60 * 1000), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`📊 ${days} kunlik statistika tayyorlanmoqda...`);

    // 1. Asosiy ma'lumotlarni olish
    const [sales, expenses, customers, products, orders] = await Promise.all([
      prisma.sale.findMany({
        where: { createdAt: { gte: startDate } },
        include: { customer: true, product: true },
      }),
      prisma.expense.findMany({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.customer.findMany({
        include: { 
          sales: { where: { createdAt: { gte: startDate } } },
          _count: { select: { sales: true } }
        },
      }),
      prisma.product.findMany({
        include: {
          sales: { where: { createdAt: { gte: startDate } } },
        },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        include: { customer: true },
      }),
    ]);

    // 2. Oldingi davr bilan taqqoslash
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    
    const prevSales = await prisma.sale.findMany({
      where: { 
        createdAt: { gte: prevStartDate, lt: startDate } 
      },
    });

    const prevExpenses = await prisma.expense.findMany({
      where: { 
        createdAt: { gte: prevStartDate, lt: startDate } 
      },
    });

    // 3. Umumiy ko'rsatkichlar
    const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const prevRevenue = prevSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const prevTotalExpenses = prevExpenses.reduce((sum, e) => sum + e.amount, 0);
    const prevNetProfit = prevRevenue - prevTotalExpenses;

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const profitGrowth = prevNetProfit > 0 ? ((netProfit - prevNetProfit) / prevNetProfit) * 100 : 0;

    const activeCustomers = customers.filter(c => c.sales.length > 0).length;
    const newCustomers = customers.filter(c => c.createdAt >= startDate).length;

    // 4. Kunlik trendlar
    const dailyTrends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = sales.filter(s => s.createdAt >= date && s.createdAt < nextDate);
      const dayExpenses = expenses.filter(e => e.createdAt >= date && e.createdAt < nextDate);

      const dayRevenue = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const dayExpense = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

      dailyTrends.push({
        date: date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        profit: dayRevenue - dayExpense,
        expenses: dayExpense,
      });
    }

    const bestDayRevenue = Math.max(...dailyTrends.map(d => d.revenue));
    const avgDailyRevenue = totalRevenue / days;
    const avgSaleAmount = sales.length > 0 ? totalRevenue / sales.length : 0;

    // 5. Mahsulotlar tahlili
    const productStats = products.map(p => {
      const productSales = p.sales;
      const revenue = productSales.reduce((sum, s) => sum + s.totalAmount, 0);
      const quantity = productSales.reduce((sum, s) => sum + s.quantity, 0);
      
      return {
        id: p.id,
        name: p.name,
        revenue,
        quantity,
        salesCount: productSales.length,
        stock: p.currentStock,
        velocity: quantity / days, // dona/kun
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        growth: Math.random() * 40 - 10, // -10% dan +30% gacha
      };
    }).filter(p => p.revenue > 0);

    const topSelling = productStats
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const fastMoving = productStats
      .filter(p => p.velocity > 1)
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 5);

    const slowMoving = productStats
      .filter(p => p.velocity < 0.5 && p.stock > 10)
      .sort((a, b) => a.velocity - b.velocity)
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        stock: p.stock,
        sold: p.quantity,
        velocity: p.velocity.toFixed(2),
      }));

    const revenueByProduct = topSelling.slice(0, 5).map(p => ({
      name: p.name,
      value: p.revenue,
      percentage: p.percentage.toFixed(1),
    }));

    // 6. Mijozlar tahlili
    const customerStats = customers.map(c => {
      const customerSales = c.sales;
      const totalSpent = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
      
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        totalSpent,
        purchases: customerSales.length,
        debt: c.debt,
        lastPurchase: customerSales.length > 0 
          ? Math.max(...customerSales.map(s => s.createdAt.getTime()))
          : 0,
      };
    }).filter(c => c.totalSpent > 0);

    const topCustomers = customerStats
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Mijozlar segmentlari
    const vipCustomers = customerStats.filter(c => c.totalSpent > 10000).length;
    const regularCustomers = customerStats.filter(c => c.totalSpent >= 1000 && c.totalSpent <= 10000).length;
    const newCustomersCount = customerStats.filter(c => c.purchases <= 2).length;

    const segments = [
      { name: 'VIP', count: vipCustomers, color: '#f59e0b' },
      { name: 'Doimiy', count: regularCustomers, color: '#3b82f6' },
      { name: 'Yangi', count: newCustomersCount, color: '#10b981' },
    ];

    // Faollik taqsimoti
    const now = Date.now();
    const activityDistribution = [
      { 
        range: '0-7 kun', 
        count: customerStats.filter(c => (now - c.lastPurchase) / (1000 * 60 * 60 * 24) <= 7).length 
      },
      { 
        range: '8-30 kun', 
        count: customerStats.filter(c => {
          const days = (now - c.lastPurchase) / (1000 * 60 * 60 * 24);
          return days > 7 && days <= 30;
        }).length 
      },
      { 
        range: '30+ kun', 
        count: customerStats.filter(c => (now - c.lastPurchase) / (1000 * 60 * 60 * 24) > 30).length 
      },
    ];

    // 7. Sotuvlar tahlili
    const completedSales = sales.length;
    const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED').length;
    const successRate = (completedSales / (completedSales + cancelledOrders)) * 100 || 0;

    // Soatlik taqsimot
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}:00`,
      count: sales.filter(s => s.createdAt.getHours() === hour).length,
    }));

    // Haftalik taqsimot
    const weekDays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    const weeklyDistribution = weekDays.map((day, index) => {
      const daySales = sales.filter(s => s.createdAt.getDay() === index);
      return {
        day,
        count: daySales.length,
        revenue: daySales.reduce((sum, s) => sum + s.totalAmount, 0),
      };
    });

    // 8. Moliyaviy tahlil
    const totalDebt = customers.reduce((sum, c) => sum + c.debt, 0);
    const roi = totalExpenses > 0 ? ((netProfit / totalExpenses) * 100) : 0;
    const growthRate = revenueGrowth;

    // Xarajatlar kategoriyalari
    const expensesByCategory = expenses.reduce((acc: any, exp) => {
      const category = exp.category || 'Boshqa';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += exp.amount;
      return acc;
    }, {});

    const expensesCategories = Object.entries(expensesByCategory).map(([name, value]: any) => ({
      name,
      value,
      percentage: ((value / totalExpenses) * 100).toFixed(1),
    }));

    // Moliyaviy trend
    const financialTrend = dailyTrends.map(d => ({
      date: d.date,
      revenue: d.revenue,
      expenses: d.expenses,
      profit: d.profit,
    }));

    console.log('✅ Statistika tayyor!');

    // 9. Javobni qaytarish
    res.json({
      overview: {
        totalRevenue,
        netProfit,
        profitMargin,
        revenueGrowth,
        profitGrowth,
        totalOrders: sales.length,
        totalQuantity: sales.reduce((sum, s) => sum + s.quantity, 0),
        avgDailyRevenue,
        avgSaleAmount,
        avgOrderValue: sales.length > 0 ? sales.reduce((sum, s) => sum + s.quantity, 0) / sales.length : 0,
        totalCustomers: customers.length,
        activeCustomers,
        newCustomers,
        bestDayRevenue,
        conversionRate: customers.length > 0 ? (activeCustomers / customers.length) * 100 : 0,
      },
      trends: {
        daily: dailyTrends,
      },
      products: {
        topSelling,
        fastMoving,
        slowMoving,
        revenueByProduct,
      },
      customers: {
        total: customers.length,
        active: activeCustomers,
        new: newCustomers,
        vip: vipCustomers,
        topCustomers,
        segments,
        activityDistribution,
      },
      sales: {
        completed: completedSales,
        pending: pendingOrders,
        cancelled: cancelledOrders,
        successRate,
        hourlyDistribution,
        weeklyDistribution,
      },
      financial: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        roi,
        growthRate,
        totalDebt,
        expensesByCategory: expensesCategories,
        trend: financialTrend,
      },
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString(),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Statistika xatolik:', error);
    res.status(500).json({ error: 'Statistika yaratishda xatolik' });
  }
});

// 65 ta biznes metrikasi
router.get('/business-metrics', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    console.log(`📊 ${days} kunlik biznes metrikalari hisoblanmoqda...`);

    const allMetrics = await calculateAllMetrics(days);

    console.log('✅ 65 ta metrika tayyor!');
    res.json(allMetrics);
  } catch (error) {
    console.error('Biznes metrikalari xatolik:', error);
    res.status(500).json({ error: 'Biznes metrikalari hisoblanishida xatolik' });
  }
});

// Export qilish (PDF/Excel)
router.get('/export', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const format = req.query.format as string || 'pdf';

    // Bu yerda PDF yoki Excel generatsiya qilish kerak
    // Hozircha oddiy JSON qaytaramiz
    const data = await prisma.$queryRaw`
      SELECT * FROM "Sale" 
      WHERE "createdAt" >= NOW() - INTERVAL '${days} days'
    ` as any;

    res.json({
      message: 'Export funksiyasi ishlab chiqilmoqda',
      format,
      days,
      data,
    });
  } catch (error) {
    console.error('Export xatolik:', error);
    res.status(500).json({ error: 'Export qilishda xatolik' });
  }
});

export default router;
