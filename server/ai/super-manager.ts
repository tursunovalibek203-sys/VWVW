import { prisma } from '../utils/prisma';

// 🤖 SUPER AI MANAGER - Hamma narsani kuzatadi!
export async function generateSuperManagerReport() {
  try {
    console.log('🤖 Super AI Manager ishga tushdi...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel ravishda barcha ma'lumotlarni olish
    const [
      salesData,
      inventoryData,
      cashboxData,
      customersData,
      ordersData,
      employeesData,
      expensesData
    ] = await Promise.all([
      analyzeSales(),
      analyzeInventory(),
      analyzeCashbox(),
      analyzeCustomers(),
      analyzeOrders(),
      analyzeEmployees(),
      analyzeExpenses()
    ]);

    // Umumiy holat
    const overallHealth = calculateOverallHealth({
      sales: salesData.health,
      inventory: inventoryData.health,
      cashbox: cashboxData.health,
      customers: customersData.health,
      orders: ordersData.health
    });

    // Kritik muammolar
    const criticalIssues = identifyCriticalIssues({
      salesData,
      inventoryData,
      cashboxData,
      customersData,
      ordersData
    });

    // AI Tavsiyalar
    const aiRecommendations = generateAIRecommendations({
      salesData,
      inventoryData,
      cashboxData,
      customersData,
      ordersData,
      criticalIssues
    });

    // Prognoz
    const forecast = generateBusinessForecast({
      salesData,
      inventoryData,
      cashboxData,
      expensesData
    });

    console.log('✅ Super AI Manager hisoboti tayyor!');

    return {
      timestamp: new Date(),
      overallHealth,
      sections: {
        sales: salesData,
        inventory: inventoryData,
        cashbox: cashboxData,
        customers: customersData,
        orders: ordersData,
        employees: employeesData,
        expenses: expensesData
      },
      criticalIssues,
      aiRecommendations,
      forecast,
      summary: generateExecutiveSummary({
        overallHealth,
        criticalIssues,
        salesData,
        inventoryData,
        cashboxData
      })
    };
  } catch (error) {
    console.error('Super Manager error:', error);
    throw error;
  }
}

// 📊 Sotuvlar tahlili
async function analyzeSales() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [todaySales, weekSales, allSales] = await Promise.all([
    prisma.sale.findMany({ where: { createdAt: { gte: today } } }),
    prisma.sale.findMany({ where: { createdAt: { gte: weekAgo } } }),
    prisma.sale.findMany({ take: 100, orderBy: { createdAt: 'desc' } })
  ]);

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.totalAmount, 0);
  const weekRevenue = weekSales.reduce((sum, s) => sum + s.totalAmount, 0);
  const avgDailyRevenue = weekRevenue / 7;

  const trend = todayRevenue > avgDailyRevenue ? 'UP' : todayRevenue < avgDailyRevenue * 0.8 ? 'DOWN' : 'STABLE';
  const health = todayRevenue >= avgDailyRevenue * 0.8 ? 'GOOD' : todayRevenue >= avgDailyRevenue * 0.5 ? 'WARNING' : 'CRITICAL';

  return {
    health,
    trend,
    today: {
      count: todaySales.length,
      revenue: todayRevenue
    },
    week: {
      count: weekSales.length,
      revenue: weekRevenue,
      avgDaily: avgDailyRevenue
    },
    performance: {
      vsAverage: ((todayRevenue / avgDailyRevenue - 1) * 100).toFixed(1),
      status: health
    },
    alerts: generateSalesAlerts(todaySales, avgDailyRevenue)
  };
}

// 📦 Ombor tahlili
async function analyzeInventory() {
  const products = await prisma.product.findMany();
  
  const lowStock = products.filter(p => p.currentStock <= p.minStockLimit);
  const outOfStock = products.filter(p => p.currentStock === 0);
  const overStock = products.filter(p => p.currentStock >= p.maxCapacity);
  const optimal = products.filter(p => 
    p.currentStock > p.minStockLimit && p.currentStock < p.maxCapacity
  );

  const health = outOfStock.length > 0 ? 'CRITICAL' : 
                 lowStock.length > products.length * 0.3 ? 'WARNING' : 'GOOD';

  return {
    health,
    total: products.length,
    status: {
      optimal: optimal.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      overStock: overStock.length
    },
    criticalProducts: lowStock.slice(0, 5).map(p => ({
      name: p.name,
      current: p.currentStock,
      min: p.minStockLimit,
      urgency: p.currentStock === 0 ? 'CRITICAL' : 'HIGH'
    })),
    alerts: generateInventoryAlerts(lowStock, outOfStock)
  };
}

// 💰 Kassa tahlili
async function analyzeCashbox() {
  const transactions = await (prisma as any).cashboxTransaction.findMany({
    take: 100,
    orderBy: { createdAt: 'desc' }
  });

  const balance = transactions.reduce((sum: number, t: any) => 
    sum + (t.type === 'INCOME' ? t.amount : -t.amount), 0
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayTransactions = transactions.filter((t: any) => t.createdAt >= today);
  const todayIncome = todayTransactions
    .filter((t: any) => t.type === 'INCOME')
    .reduce((sum: number, t: any) => sum + t.amount, 0);
  const todayExpense = todayTransactions
    .filter((t: any) => t.type === 'EXPENSE')
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const health = balance < 0 ? 'CRITICAL' : 
                 balance < 1000000 ? 'WARNING' : 'GOOD';

  return {
    health,
    balance,
    today: {
      income: todayIncome,
      expense: todayExpense,
      net: todayIncome - todayExpense,
      transactions: todayTransactions.length
    },
    alerts: generateCashboxAlerts(balance, todayIncome, todayExpense)
  };
}

// 👥 Mijozlar tahlili
async function analyzeCustomers() {
  const customers = await prisma.customer.findMany({
    include: { _count: { select: { sales: true } } }
  });

  const withDebt = customers.filter(c => c.debt > 0);
  const totalDebt = withDebt.reduce((sum, c) => sum + c.debt, 0);
  const active = customers.filter(c => c._count.sales > 0);
  const vip = customers.filter(c => c.category === 'VIP');

  const health = totalDebt > 10000000 ? 'WARNING' : 'GOOD';

  return {
    health,
    total: customers.length,
    active: active.length,
    vip: vip.length,
    debt: {
      customers: withDebt.length,
      total: totalDebt,
      avg: withDebt.length > 0 ? totalDebt / withDebt.length : 0
    },
    topDebtors: withDebt
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 5)
      .map(c => ({ name: c.name, debt: c.debt })),
    alerts: generateCustomerAlerts(withDebt, totalDebt)
  };
}

// 📋 Buyurtmalar tahlili
async function analyzeOrders() {
  const orders = await prisma.order.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' }
  });

  const pending = orders.filter(o => o.status === 'PENDING');
  const inProduction = orders.filter(o => o.status === 'IN_PRODUCTION');
  const ready = orders.filter(o => o.status === 'READY');
  const delayed = orders.filter(o => 
    o.status !== 'DELIVERED' && new Date(o.requestedDate) < new Date()
  );

  const health = delayed.length > orders.length * 0.2 ? 'WARNING' : 'GOOD';

  return {
    health,
    total: orders.length,
    status: {
      pending: pending.length,
      inProduction: inProduction.length,
      ready: ready.length,
      delayed: delayed.length
    },
    alerts: generateOrderAlerts(pending, delayed)
  };
}

// 👨‍💼 Xodimlar tahlili
async function analyzeEmployees() {
  const users = await prisma.user.findMany({
    where: { active: true }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sales = await prisma.sale.findMany({
    where: { createdAt: { gte: today } },
    include: { user: true }
  });

  const userStats: any = {};
  sales.forEach(s => {
    if (!userStats[s.userId]) {
      userStats[s.userId] = {
        name: s.user.name,
        sales: 0,
        revenue: 0
      };
    }
    userStats[s.userId].sales++;
    userStats[s.userId].revenue += s.totalAmount;
  });

  const topPerformers = Object.values(userStats)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 3);

  return {
    total: users.length,
    active: users.filter(u => u.active).length,
    topPerformers,
    avgSalesPerUser: sales.length / users.length
  };
}

// 💸 Xarajatlar tahlili
async function analyzeExpenses() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const [todayExpenses, weekExpenses] = await Promise.all([
    prisma.expense.findMany({ where: { createdAt: { gte: today } } }),
    prisma.expense.findMany({ where: { createdAt: { gte: weekAgo } } })
  ]);

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const weekTotal = weekExpenses.reduce((sum, e) => sum + e.amount, 0);
  const avgDaily = weekTotal / 7;

  return {
    today: todayTotal,
    week: weekTotal,
    avgDaily,
    trend: todayTotal > avgDaily * 1.5 ? 'HIGH' : 'NORMAL'
  };
}

// 🚨 Kritik muammolarni aniqlash
function identifyCriticalIssues(data: any) {
  const issues = [];

  // Sotuvlar
  if (data.salesData.health === 'CRITICAL') {
    issues.push({
      severity: 'CRITICAL',
      category: 'SALES',
      title: 'Sotuvlar juda past!',
      description: `Bugungi sotuv o'rtachadan ${data.salesData.performance.vsAverage}% past`,
      action: 'Darhol marketing kampaniyasini boshlang'
    });
  }

  // Ombor
  if (data.inventoryData.status.outOfStock > 0) {
    issues.push({
      severity: 'CRITICAL',
      category: 'INVENTORY',
      title: `${data.inventoryData.status.outOfStock} ta mahsulot tugadi!`,
      description: 'Mahsulotlar zaxirasi 0',
      action: 'Tezda buyurtma bering'
    });
  }

  // Kassa
  if (data.cashboxData.balance < 0) {
    issues.push({
      severity: 'CRITICAL',
      category: 'CASHBOX',
      title: 'Kassada manfiy balans!',
      description: `Balans: ${data.cashboxData.balance} UZS`,
      action: 'Darhol kassani to\'ldiring'
    });
  }

  // Qarzlar
  if (data.customersData.debt.total > 10000000) {
    issues.push({
      severity: 'WARNING',
      category: 'CUSTOMERS',
      title: 'Katta qarzlar!',
      description: `Jami qarz: ${data.customersData.debt.total} UZS`,
      action: 'Qarzlarni yig\'ishni boshlang'
    });
  }

  // Buyurtmalar
  if (data.ordersData.status.delayed > 0) {
    issues.push({
      severity: 'WARNING',
      category: 'ORDERS',
      title: `${data.ordersData.status.delayed} ta buyurtma kechikmoqda`,
      description: 'Muddati o\'tgan buyurtmalar',
      action: 'Ishlab chiqarishni tezlashtiring'
    });
  }

  return issues;
}

// 💡 AI Tavsiyalar
function generateAIRecommendations(data: any) {
  const recommendations = [];

  // Sotuvlar uchun
  if (data.salesData.trend === 'DOWN') {
    recommendations.push({
      priority: 'HIGH',
      category: 'SALES',
      title: 'Sotuvlarni oshiring',
      actions: [
        'Chegirmalar e\'lon qiling',
        'Yangi mijozlar jalb qiling',
        'Marketing kampaniyasi boshlang',
        'VIP mijozlarga maxsus takliflar'
      ],
      expectedImpact: '+20-30% sotuv'
    });
  }

  // Ombor uchun
  if (data.inventoryData.status.lowStock > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'INVENTORY',
      title: 'Mahsulotlarni buyurtma qiling',
      actions: [
        `${data.inventoryData.status.lowStock} ta mahsulot kam`,
        'Tezda ta\'minotchilarga buyurtma bering',
        'Optimal zaxira darajasini saqlang'
      ],
      expectedImpact: 'Sotuvlar to\'xtamaydi'
    });
  }

  // Kassa uchun
  if (data.cashboxData.balance < 5000000) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'CASHBOX',
      title: 'Kassani to\'ldiring',
      actions: [
        'Bankdan pul oling',
        'Qarzlarni yig\'ing',
        'Katta xarajatlarni kechiktiring'
      ],
      expectedImpact: 'Pul oqimi yaxshilanadi'
    });
  }

  // Mijozlar uchun
  if (data.customersData.debt.total > 5000000) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'CUSTOMERS',
      title: 'Qarzlarni yig\'ing',
      actions: [
        'Qarzli mijozlarga qo\'ng\'iroq qiling',
        'To\'lov rejasi taklif qiling',
        'Chegirmalar bering (tez to\'lash uchun)'
      ],
      expectedImpact: 'Pul oqimi yaxshilanadi'
    });
  }

  return recommendations;
}

// 📈 Biznes prognozi
function generateBusinessForecast(data: any) {
  const avgRevenue = data.salesData.week.avgDaily;
  const avgExpense = data.expensesData.avgDaily;
  const netProfit = avgRevenue - avgExpense;

  return {
    next7Days: {
      revenue: avgRevenue * 7,
      expense: avgExpense * 7,
      profit: netProfit * 7
    },
    next30Days: {
      revenue: avgRevenue * 30,
      expense: avgExpense * 30,
      profit: netProfit * 30
    },
    confidence: data.salesData.trend === 'STABLE' ? 'HIGH' : 'MEDIUM'
  };
}

// 📝 Boshqaruv xulosasi
function generateExecutiveSummary(data: any) {
  const { overallHealth, criticalIssues, salesData, inventoryData, cashboxData } = data;

  let summary = `Biznes holati: ${overallHealth}\n\n`;

  if (criticalIssues.length > 0) {
    summary += `⚠️ ${criticalIssues.length} ta kritik muammo:\n`;
    criticalIssues.slice(0, 3).forEach((issue: any) => {
      summary += `- ${issue.title}\n`;
    });
    summary += '\n';
  }

  summary += `📊 Bugungi natijalar:\n`;
  summary += `- Sotuv: ${salesData.today.revenue.toLocaleString()} UZS\n`;
  summary += `- Kassa: ${cashboxData.balance.toLocaleString()} UZS\n`;
  summary += `- Mahsulotlar: ${inventoryData.status.optimal}/${inventoryData.total} optimal\n`;

  return summary;
}

// Yordamchi funksiyalar
function calculateOverallHealth(healths: any) {
  const values = Object.values(healths);
  if (values.includes('CRITICAL')) return 'CRITICAL';
  if (values.filter(v => v === 'WARNING').length >= 2) return 'WARNING';
  return 'GOOD';
}

function generateSalesAlerts(sales: any[], avgDaily: number) {
  const alerts = [];
  const todayRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
  
  if (todayRevenue < avgDaily * 0.5) {
    alerts.push('Sotuvlar juda past!');
  }
  if (sales.length === 0) {
    alerts.push('Bugun hali sotuvlar yo\'q!');
  }
  return alerts;
}

function generateInventoryAlerts(lowStock: any[], outOfStock: any[]) {
  const alerts = [];
  if (outOfStock.length > 0) {
    alerts.push(`${outOfStock.length} ta mahsulot tugadi!`);
  }
  if (lowStock.length > 5) {
    alerts.push(`${lowStock.length} ta mahsulot kam qoldi`);
  }
  return alerts;
}

function generateCashboxAlerts(balance: number, income: number, expense: number) {
  const alerts = [];
  if (balance < 0) alerts.push('Manfiy balans!');
  if (balance < 1000000) alerts.push('Kam pul qoldi');
  if (expense > income * 1.5) alerts.push('Xarajatlar ko\'p!');
  return alerts;
}

function generateCustomerAlerts(withDebt: any[], totalDebt: number) {
  const alerts = [];
  if (totalDebt > 10000000) alerts.push('Katta qarzlar!');
  if (withDebt.length > 20) alerts.push(`${withDebt.length} ta qarzli mijoz`);
  return alerts;
}

function generateOrderAlerts(pending: any[], delayed: any[]) {
  const alerts = [];
  if (pending.length > 10) alerts.push(`${pending.length} ta kutilayotgan buyurtma`);
  if (delayed.length > 0) alerts.push(`${delayed.length} ta kechikkan buyurtma`);
  return alerts;
}
