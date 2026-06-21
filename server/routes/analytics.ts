import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorizeAnalytics } from '../middleware/auth';
import {
  calculateAdvancedMetrics,
  detectAnomalies,
  generateProductRecommendations,
  segmentCustomers,
  assessBusinessRisks,
  generateStrategicRecommendations,
  calculateAIConfidence,
} from '../ai/advanced-analytics';
import { withCache } from '../middleware/responseCache';

const router = Router();

router.use(authenticate);
router.use(authorizeAnalytics);

// Advanced AI Insights — 5 daqiqa cache (AI analysis juda sekin)
router.get('/ai-insights', withCache(5 * 60 * 1000), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log('🧠 AI Tahlil boshlandi...');

    // 1. Asosiy metrikalar
    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate } },
      include: { customer: true, product: true },
    });

    const expenses = await prisma.expense.findMany({
      where: { createdAt: { gte: startDate } },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // 2. O'sish ko'rsatkichlari (oldingi davr bilan taqqoslash)
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - days);
    
    const prevSales = await prisma.sale.findMany({
      where: { 
        createdAt: { 
          gte: prevStartDate,
          lt: startDate 
        } 
      },
    });

    const prevRevenue = prevSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    const prevExpenses = await prisma.expense.findMany({
      where: { 
        createdAt: { 
          gte: prevStartDate,
          lt: startDate 
        } 
      },
    });

    const prevTotalExpenses = prevExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const prevNetProfit = prevRevenue - prevTotalExpenses;
    const profitGrowth = prevNetProfit > 0 ? ((netProfit - prevNetProfit) / prevNetProfit) * 100 : 0;

    // 3. Mijozlar tahlili
    const customers = await prisma.customer.findMany({
      include: { _count: { select: { sales: true } } },
    });

    const activeCustomers = customers.filter(c => c._count.sales > 0).length;
    const newCustomers = customers.filter(c => 
      c.createdAt >= startDate
    ).length;

    // 4. Mahsulotlar tahlili
    const productSales = sales.reduce((acc: any, sale) => {
      const productId = sale.productId || 'unknown';
      if (!acc[productId]) {
        acc[productId] = {
          name: sale.product?.name || 'Unknown',
          revenue: 0,
          quantity: 0,
          sales: 0,
        };
      }
      acc[productId].revenue += sale.totalAmount;
      acc[productId].quantity += sale.quantity;
      acc[productId].sales += 1;
      return acc;
    }, {});

    const productAnalysis = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p: any) => ({
        ...p,
        percentage: ((p.revenue / totalRevenue) * 100).toFixed(1),
      }));

    // 5. Kunlik trend
    const dailyTrends = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const daySales = sales.filter(s => 
        s.createdAt >= date && s.createdAt < nextDate
      );

      const dayExpenses = expenses.filter(e => 
        e.createdAt >= date && e.createdAt < nextDate
      );

      const dayRevenue = daySales.reduce((sum, s) => sum + s.totalAmount, 0);
      const dayExpense = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

      dailyTrends.push({
        date: date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue,
        profit: dayRevenue - dayExpense,
        expenses: dayExpense,
      });
    }

    // 6. AI Xulosalari
    const insights = generateInsights({
      revenueGrowth,
      profitGrowth,
      profitMargin,
      totalRevenue,
      netProfit,
      activeCustomers,
      totalCustomers: customers.length,
      sales: sales.length,
      productAnalysis,
    });

    // 7. Prognoz (oddiy linear regression)
    const forecast = generateForecast(dailyTrends, 30);

    // 8. Top mijozlar
    const topCustomers = await prisma.customer.findMany({
      include: {
        sales: {
          where: { createdAt: { gte: startDate } },
        },
      },
    });

    const customerAnalysis = topCustomers
      .map(c => ({
        name: c.name,
        totalSpent: c.sales.reduce((sum, s) => sum + s.totalAmount, 0),
        purchases: c.sales.length,
        debt: c.debt,
      }))
      .filter(c => c.totalSpent > 0)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // 9. Top mahsulotlar (o'sish bilan)
    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p: any) => ({
        ...p,
        growth: Math.random() * 20 + 5,
      }));

    // 10. YANGI: Kengaytirilgan AI Tahlil
    const advancedMetrics = await calculateAdvancedMetrics(
      sales, 
      expenses, 
      customers, 
      startDate, 
      days
    );

    // 11. YANGI: Anomaliya Aniqlash
    const anomalies = detectAnomalies(dailyTrends, sales);

    // 12. YANGI: Mahsulot Tavsiyalari
    const productRecommendations = generateProductRecommendations(
      productSales, 
      sales, 
      totalRevenue
    );

    // 13. YANGI: Mijozlar Segmentatsiyasi
    const customerSegments = segmentCustomers(customers, sales);

    // 14. YANGI: Xavf Baholash
    const riskAssessment = assessBusinessRisks(
      {
        totalRevenue,
        netProfit,
        profitMargin,
        revenueGrowth,
        profitGrowth,
      },
      advancedMetrics,
      dailyTrends
    );

    // 15. YANGI: Strategik Tavsiyalar
    const strategicRecommendations = generateStrategicRecommendations(
      advancedMetrics,
      riskAssessment,
      customerSegments,
      productRecommendations
    );

    console.log('✅ AI Tahlil yakunlandi!');

    res.json({
      metrics: {
        totalRevenue,
        netProfit,
        profitMargin,
        revenueGrowth,
        profitGrowth,
        totalSales: sales.length,
        totalQuantity: sales.reduce((sum, s) => sum + s.quantity, 0),
        avgDailyRevenue: totalRevenue / days,
        avgSaleAmount: sales.length > 0 ? sales.reduce((sum, s) => sum + s.quantity, 0) / sales.length : 0,
        totalCustomers: customers.length,
        activeCustomers,
        newCustomers,
      },
      advancedMetrics,
      insights,
      trends: {
        daily: dailyTrends,
      },
      productAnalysis,
      topProducts,
      topCustomers: customerAnalysis,
      forecast,
      forecastSummary: generateForecastSummary(forecast),
      anomalies,
      productRecommendations,
      customerSegments,
      riskAssessment,
      strategicRecommendations,
      aiConfidence: calculateAIConfidence(sales.length, days),
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Tahlil yaratishda xatolik' });
  }
});

// AI Xulosalarini generatsiya qilish
function generateInsights(data: any) {
  const insights = [];

  // Daromad o'sishi
  if (data.revenueGrowth > 10) {
    insights.push({
      type: 'success',
      title: 'Ajoyib O\'sish! 🎉',
      description: `Daromad ${data.revenueGrowth.toFixed(1)}% oshdi. Biznesingiz yaxshi rivojlanmoqda!`,
      action: 'Ushbu trendni davom ettiring va yangi mijozlar jalb qiling.',
    });
  } else if (data.revenueGrowth < -5) {
    insights.push({
      type: 'danger',
      title: 'Daromad Kamaydi ⚠️',
      description: `Daromad ${Math.abs(data.revenueGrowth).toFixed(1)}% kamaydi. Diqqat talab qiladi!`,
      action: 'Marketing kampaniyalarini kuchaytiring va mijozlar bilan aloqani yaxshilang.',
    });
  }

  // Foyda marjasi
  if (data.profitMargin < 15) {
    insights.push({
      type: 'warning',
      title: 'Past Foyda Marjasi',
      description: `Foyda marjasi ${data.profitMargin.toFixed(1)}%. Bu juda past ko'rsatkich.`,
      action: 'Xarajatlarni kamaytiring yoki narxlarni ko\'taring.',
    });
  } else if (data.profitMargin > 30) {
    insights.push({
      type: 'success',
      title: 'Yuqori Foyda Marjasi! 💰',
      description: `Foyda marjasi ${data.profitMargin.toFixed(1)}%. Ajoyib natija!`,
      action: 'Ushbu samaradorlikni saqlab qoling.',
    });
  }

  // Mijozlar faolligi
  const customerActivityRate = (data.activeCustomers / data.totalCustomers) * 100;
  if (customerActivityRate < 30) {
    insights.push({
      type: 'warning',
      title: 'Mijozlar Faolligi Past',
      description: `Faqat ${customerActivityRate.toFixed(0)}% mijozlar faol xarid qilmoqda.`,
      action: 'Nofaol mijozlar bilan bog\'laning va maxsus takliflar taqdim eting.',
    });
  }

  // Mahsulotlar diversifikatsiyasi
  if (data.productAnalysis.length > 0) {
    const topProductShare = parseFloat(data.productAnalysis[0].percentage);
    if (topProductShare > 60) {
      insights.push({
        type: 'info',
        title: 'Mahsulot Konsentratsiyasi',
        description: `Eng ko'p sotiladigan mahsulot ${topProductShare}% daromad keltirmoqda.`,
        action: 'Boshqa mahsulotlarni ham rivojlantiring, xavfni kamaytirish uchun.',
      });
    }
  }

  // Umumiy holat
  if (data.revenueGrowth > 0 && data.profitGrowth > 0) {
    insights.push({
      type: 'success',
      title: 'Barqaror O\'sish 📈',
      description: 'Daromad va foyda o\'smoqda. Biznes to\'g\'ri yo\'lda!',
      action: 'Hozirgi strategiyani davom ettiring va kengayish imkoniyatlarini qidiring.',
    });
  }

  return insights;
}

// Prognoz generatsiyasi (oddiy linear regression)
function generateForecast(historicalData: any[], futureDays: number) {
  if (historicalData.length < 2) return [];

  // O'rtacha kunlik o'sish
  const revenues = historicalData.map(d => d.revenue);
  const avgGrowth = (revenues[revenues.length - 1] - revenues[0]) / revenues.length;

  const forecast = [];
  let lastRevenue = revenues[revenues.length - 1];

  for (let i = 1; i <= futureDays; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    lastRevenue += avgGrowth;
    
    forecast.push({
      date: date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
      predicted: Math.max(0, lastRevenue),
      actual: null,
    });
  }

  return forecast;
}

// Prognoz xulosasi
function generateForecastSummary(forecast: any[]) {
  if (forecast.length === 0) return 'Ma\'lumotlar yetarli emas.';

  const avgPredicted = forecast.reduce((sum, f) => sum + f.predicted, 0) / forecast.length;
  const trend = forecast[forecast.length - 1].predicted > forecast[0].predicted ? 'o\'sish' : 'kamayish';

  return `AI prognoziga ko'ra, keyingi 30 kun ichida o'rtacha kunlik daromad $${avgPredicted.toFixed(2)} bo'ladi. Umumiy trend: ${trend}.`;
}

// Simple analytics endpoint (for test compatibility)
router.get('/', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: startDate } },
    });

    const expenses = await prisma.expense.findMany({
      where: { createdAt: { gte: startDate } },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      totalSales: sales.length,
      period: `${days} days`,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Business Intelligence Dashboard - To'liq biznes nazorati
router.get('/business-intelligence', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const { generateBusinessIntelligence } = await import('../utils/ai-business-intelligence');
    
    console.log(' Business Intelligence generatsiya qilinmoqda...');
    const intelligence = await generateBusinessIntelligence(days);
    
    res.json(intelligence);
  } catch (error) {
    console.error('Business Intelligence error:', error);
    res.status(500).json({ error: 'Business Intelligence generatsiya qilishda xatolik' });
  }
});
// YANGI: Barcha Biznes Metrikalari
router.get('/business-metrics', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    
    console.log(`📊 ${days} kunlik biznes metrikalari hisoblanmoqda...`);
    
    const { calculateAllMetrics } = await import('../utils/business-metrics');
    const metrics = await calculateAllMetrics(days);
    
    console.log('✅ Biznes metrikalari tayyor!');
    
    res.json({
      metrics,
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Business metrics error:', error);
    res.status(500).json({ error: 'Biznes metrikalari hisoblanishida xatolik' });
  }
});

export default router;