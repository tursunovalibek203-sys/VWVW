import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Generate weekly trend data (last 7 days) - Batch queries with raw SQL for better performance
    const weeklyData = await prisma.$queryRaw`
      SELECT 
        DATE(createdAt) as day,
        SUM(CASE WHEN totalAmount IS NOT NULL THEN totalAmount ELSE 0 END) as sales,
        0 as expenses
      FROM Sale
      WHERE createdAt >= datetime(${new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()})
      GROUP BY DATE(createdAt)
      ORDER BY day DESC
      LIMIT 7
    `;

    const expenseData = await prisma.$queryRaw`
      SELECT 
        DATE(createdAt) as day,
        SUM(amount) as total
      FROM Expense
      WHERE createdAt >= datetime(${new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()})
      GROUP BY DATE(createdAt)
    `;

    // Convert to weekly trend format
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayData = (weeklyData as any[]).find((d: any) => {
        const d_date = new Date(d.day);
        d_date.setHours(0, 0, 0, 0);
        return d_date.getTime() === date.getTime();
      });

      const expData = (expenseData as any[]).find((d: any) => {
        const d_date = new Date(d.day);
        d_date.setHours(0, 0, 0, 0);
        return d_date.getTime() === date.getTime();
      });

      weeklyTrend.push({
        day: date.toLocaleDateString('uz-UZ', { weekday: 'short' }),
        sales: dayData?.sales ? Number(dayData.sales) : 0,
        profit: (dayData?.sales ? Number(dayData.sales) : 0) - (expData?.total ? Number(expData.total) : 0),
      });
    }

    // Optimize: Batch all queries together
    const [dailySales, monthlySales, totalDebt, expenses, topProducts, topCustomers, lowStock, todaySalesCount, totalCustomers, totalProducts, activeProduction, pendingTasks, pendingDeliveries] = await Promise.all([
      prisma.sale.aggregate({
        where: { createdAt: { gte: today } },
        _sum: { totalAmount: true },
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { totalAmount: true },
      }),
      prisma.customer.aggregate({
        _sum: { debt: true },
      }),
      prisma.expense.aggregate({
        where: { createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.saleItem.groupBy({
        by: ['productId'],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { subtotal: 'desc' } },
        take: 5,
      }),
      prisma.sale.groupBy({
        by: ['customerId'],
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 5,
      }),
      prisma.$queryRaw`
        SELECT id, name, currentStock, minStockLimit
        FROM Product
        WHERE currentStock <= minStockLimit OR currentStock = 0
        LIMIT 10
      `,
      prisma.sale.count({
        where: { createdAt: { gte: today } }
      }),
      prisma.customer.count(),
      prisma.product.count({
        where: { active: true }
      }),
      prisma.productionOrder.count({
        where: { status: 'IN_PROGRESS' }
      }),
      prisma.task.count({
        where: { status: 'TODO' }
      }),
      prisma.deliveryNew.count({
        where: { status: 'PENDING' }
      }),
    ]);

    // Calculate cash balance from recent cashbox transactions (limit to last 1000)
    const cashboxSummary = await prisma.cashboxTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { type: true, amount: true }
    });

    const cashboxIncome = cashboxSummary
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    const cashboxExpense = cashboxSummary
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);
    const cashBalance = cashboxIncome - cashboxExpense;

    const productIds = topProducts.map(p => p.productId).filter((id): id is string => id !== null);
    const products = await prisma.product.findMany({ 
      where: { id: { in: productIds } },
      select: { id: true, name: true }
    });

    const customerIds = topCustomers.map(c => c.customerId).filter((id): id is string => id !== null);
    const customers = await prisma.customer.findMany({ 
      where: { id: { in: customerIds } },
      select: { id: true, name: true, debt: true }
    });

    const revenue = monthlySales._sum.totalAmount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    const netProfit = revenue - totalExpenses;

    // Calculate trends (mock data for now)
    const dailyTrend = Math.floor(Math.random() * 20) - 10; // -10 to +10
    const monthlyTrend = Math.floor(Math.random() * 30) - 15; // -15 to +15
    const profitTrend = Math.floor(Math.random() * 25) - 12; // -12 to +12

    res.json({
      dailyRevenue: dailySales._sum.totalAmount || 0,
      monthlyRevenue: revenue,
      netProfit,
      totalExpenses,
      totalDebt: totalDebt._sum.debt || 0,
      cashBalance,
      weeklyTrend,
      todaySales: todaySalesCount,
      debtorsCount: customers.filter(c => c.debt > 0).length,
      totalCustomers,
      totalProducts,
      activeProduction,
      pendingTasks,
      pendingDeliveries,
      dailyTrend,
      monthlyTrend,
      profitTrend,
      topProducts: topProducts.map(tp => ({
        ...products.find(p => p.id === tp.productId),
        totalSold: tp._sum.quantity,
        revenue: tp._sum.subtotal,
      })),
      topCustomers: topCustomers.map(tc => ({
        ...customers.find(c => c.id === tc.customerId),
        totalSpent: tc._sum.totalAmount,
      })),
      lowStock,
    });
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export default router;
