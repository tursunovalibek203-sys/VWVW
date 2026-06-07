import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { DecimalHelper } from '../utils/decimal-helper';

const router = Router();

router.use(authenticate);

router.get('/summary', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Kassa tranzaksiyalaridan hisoblash (asosiy manba)
    const cashboxTransactions = await prisma.cashboxTransaction.findMany();
    
    // ✅ DECIMAL FIX: Use DecimalHelper for sum calculations
    const cashboxIncome = cashboxTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => DecimalHelper.add(sum, t.amount), 0);
    const cashboxExpense = cashboxTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => DecimalHelper.add(sum, t.amount), 0);
    
    // Bugungi tranzaksiyalar
    const todayCashboxIncome = cashboxTransactions
      .filter(t => t.type === 'INCOME' && new Date(t.createdAt) >= today)
      .reduce((sum, t) => DecimalHelper.add(sum, t.amount), 0);
    const todayCashboxExpense = cashboxTransactions
      .filter(t => t.type === 'EXPENSE' && new Date(t.createdAt) >= today)
      .reduce((sum, t) => DecimalHelper.add(sum, t.amount), 0);
    
    // Oylik tranzaksiyalar
    const monthlyCashboxIncome = cashboxTransactions
      .filter(t => t.type === 'INCOME' && new Date(t.createdAt) >= monthStart)
      .reduce((sum, t) => DecimalHelper.add(sum, t.amount), 0);
    const monthlyCashboxExpense = cashboxTransactions
      .filter(t => t.type === 'EXPENSE' && new Date(t.createdAt) >= monthStart)
      .reduce((sum, t) => DecimalHelper.add(sum, t.amount), 0);

    // Backup: Sales, expenses, payments jadvallaridan ham hisoblash
    const sales = await prisma.sale.findMany({
      where: { paymentStatus: { in: ['PAID', 'PARTIAL'] } },
    });
    const expenses = await prisma.expense.findMany();
    const payments = await prisma.payment.findMany();

    // Agar cashboxTransaction bo'sh bo'lsa, sales/payments dan hisoblash
    let totalIncome = cashboxIncome;
    let totalExpense = cashboxExpense;
    let todayIncome = todayCashboxIncome;
    let todayExpense = todayCashboxExpense;
    let monthlyIncome = monthlyCashboxIncome;
    let monthlyExpense = monthlyCashboxExpense;
    
    if (cashboxTransactions.length === 0) {
      // CashboxTransaction bo'sh bo'lsa, eski usul bilan hisoblash
      const salesIncome = sales.reduce((sum, s) => sum + s.paidAmount, 0);
      const paymentsIncome = payments.reduce((sum, p) => sum + p.amount, 0);
      const expensesIncome = expenses.reduce((sum, e) => sum + (e.amount < 0 ? Math.abs(e.amount) : 0), 0);
      const expensesExpense = expenses.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
      
      totalIncome = salesIncome + paymentsIncome + expensesIncome;
      totalExpense = expensesExpense;
      
      // Bugungi hisoblash
      const todaySales = sales.filter(s => s.createdAt >= today);
      const todayExpenses = expenses.filter(e => e.createdAt >= today);
      const todayPayments = payments.filter(p => p.createdAt >= today);
      todayIncome = todaySales.reduce((sum, s) => sum + s.paidAmount, 0) + 
                    todayPayments.reduce((sum, p) => sum + p.amount, 0) +
                    todayExpenses.reduce((sum, e) => sum + (e.amount < 0 ? Math.abs(e.amount) : 0), 0);
      todayExpense = todayExpenses.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
      
      // Oylik hisoblash
      const monthlySales = sales.filter(s => s.createdAt >= monthStart);
      const monthlyExpenses = expenses.filter(e => e.createdAt >= monthStart);
      const monthlyPayments = payments.filter(p => p.createdAt >= monthStart);
      monthlyIncome = monthlySales.reduce((sum, s) => sum + s.paidAmount, 0) + 
                      monthlyPayments.reduce((sum, p) => sum + p.amount, 0) +
                      monthlyExpenses.reduce((sum, e) => sum + (e.amount < 0 ? Math.abs(e.amount) : 0), 0);
      monthlyExpense = monthlyExpenses.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
    }
    
    const totalBalance = totalIncome - totalExpense;

    // Valyuta bo'yicha hisoblash
    // When cashboxTransactions exist they are the authoritative source (SalesService writes
    // both Sale + CashboxTransaction inside the same DB transaction).  Using sales/payments
    // as a fallback ONLY when the cashbox table is truly empty prevents double-counting.
    let cashUZS = 0, cashUSD = 0, cardUZS = 0, clickUZS = 0;

    if (cashboxTransactions.length > 0) {
      // Primary path: derive currency breakdown from CashboxTransaction rows
      cashboxTransactions.forEach(tx => {
        const txCurrency = tx.currency || 'UZS';
        const paymentMethod = tx.paymentMethod || 'CASH';
        const sign = tx.type === 'INCOME' ? 1 : -1;

        if (paymentMethod === 'CLICK' || (tx.category === 'SALE' && tx.description?.includes('Click'))) {
          clickUZS += sign * tx.amount;
        } else if (paymentMethod === 'CARD' || (tx.category === 'SALE' && (tx.description?.includes('Karta') || tx.description?.includes('CARD')))) {
          // Karta faqat UZS
          cardUZS += sign * tx.amount;
        } else if (txCurrency === 'USD') {
          cashUSD += sign * tx.amount;
        } else {
          // UZS naqd
          cashUZS += sign * tx.amount;
        }
      });
      // Manfiy qoldiqni nolga tenglashtirish (ma'lumot nomuvofiqligi uchun)
      cashUZS  = Math.max(0, cashUZS);
      cashUSD  = Math.max(0, cashUSD);
      cardUZS  = Math.max(0, cardUZS);
      clickUZS = Math.max(0, clickUZS);
    } else {
      // Fallback path (legacy data only): derive from Sale + Payment + Expense tables
      sales.forEach(sale => {
        if (sale.paymentDetails) {
          try {
            const details = JSON.parse(sale.paymentDetails);
            cashUZS += details.uzs || 0;
            cashUSD += details.usd || 0;
            clickUZS += details.click || 0;
            cardUZS += details.card || 0;
          } catch {
            if (sale.currency === 'UZS') cashUZS += sale.paidAmount || 0;
            else cashUSD += sale.paidAmount || 0;
          }
        } else {
          if (sale.currency === 'UZS') cashUZS += sale.paidAmount || 0;
          else cashUSD += sale.paidAmount || 0;
        }
      });

      payments.forEach(payment => {
        if (payment.paymentDetails) {
          try {
            const details = JSON.parse(payment.paymentDetails);
            cashUZS += details.uzs || 0;
            cashUSD += details.usd || 0;
            clickUZS += details.click || 0;
            cardUZS += details.card || 0;
          } catch {
            if (payment.currency === 'UZS') cashUZS += payment.amount || 0;
            else cashUSD += payment.amount || 0;
          }
        } else {
          if (payment.currency === 'UZS') cashUZS += payment.amount || 0;
          else cashUSD += payment.amount || 0;
        }
      });

      expenses.forEach(expense => {
        if (expense.amount < 0) {
          const amount = Math.abs(expense.amount);
          if (expense.currency === 'UZS' && ['KASSA_KIRIM', 'TRANSFER_IN'].includes(expense.category)) {
            cashUZS += amount;
          } else if (expense.currency === 'USD') {
            cashUSD += amount;
          }
        }
      });
    }

    const dailyFlow = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const daySales = sales.filter(s => s.createdAt >= date && s.createdAt < nextDate);
      const dayExpenses = expenses.filter(e => e.createdAt >= date && e.createdAt < nextDate);
      const dayPayments = payments.filter(p => p.createdAt >= date && p.createdAt < nextDate);
      const income = daySales.reduce((sum, s) => sum + s.paidAmount, 0) + dayPayments.reduce((sum, p) => sum + p.amount, 0);
      // Faqat musbat kunlik xarajatlarni hisoblaymiz
      const expense = dayExpenses.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
      dailyFlow.push({
        date: date.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
        income, expense, net: income - expense,
      });
    }

    // Jami USD ekvivalentini hisoblash
    const exchangeRate = parseInt(process.env.USD_TO_UZS_RATE || '12500', 10);
    const totalUSD = (cashUZS + clickUZS + cardUZS) / exchangeRate + cashUSD;

    res.json({
      totalBalance,
      totalUSD,
      todayIncome,
      todayExpense,
      monthlyIncome,
      monthlyExpense,
      byCurrency: {
        cashUZS,
        cashUSD,
        cardUZS,
        clickUZS
      },
      dailyFlow
    });
  } catch (error) {
    console.error('Cashbox summary error:', error);
    res.status(500).json({ error: 'Kassa malumotlarini yuklashda xatolik' });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const sales = await prisma.sale.findMany({ where: { paymentStatus: { in: ['PAID', 'PARTIAL'] } }, include: { customer: true }, orderBy: { createdAt: 'desc' }, take: limit });
    const expenses = await prisma.expense.findMany({ orderBy: { createdAt: 'desc' }, take: limit });
    const payments = await prisma.payment.findMany({ include: { customer: true }, orderBy: { createdAt: 'desc' }, take: limit });

    const getPaymentMethod = (paymentDetails: string | null): string => {
      if (!paymentDetails) return 'CASH';
      try {
        const details = JSON.parse(paymentDetails);
        if (details.click > 0) return 'CLICK';
        if (details.usd > 0) return 'CARD';
        if (details.uzs > 0) return 'CASH';
      } catch (e) {}
      return 'CASH';
    };

    const transactions = [
      ...sales.map(s => ({ id: `sale-${s.id}`, type: 'INCOME', amount: s.paidAmount, currency: s.currency, description: `Sotuv - ${s.customer?.name}`, paymentMethod: getPaymentMethod(s.paymentDetails), createdAt: s.createdAt })),
      ...expenses.map(e => ({ id: `expense-${e.id}`, type: 'EXPENSE', amount: e.amount, currency: e.currency, description: `${e.category} - ${e.description}`, paymentMethod: 'CASH', createdAt: e.createdAt })),
      ...payments.map(p => ({ id: `payment-${p.id}`, type: 'INCOME', amount: p.amount, currency: p.currency, description: `Qarz tolovi - ${p.customer?.name}`, paymentMethod: getPaymentMethod(p.paymentDetails), createdAt: p.createdAt })),
    ];

    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(transactions.slice(0, limit));
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: 'Tranzaksiyalarni yuklashda xatolik' });
  }
});

router.post('/add', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER', 'SELLER'), async (req: AuthRequest, res) => {
  try {
    const { amount, currency, type, description } = req.body;
    await prisma.cashboxTransaction.create({
      data: {
        type: 'INCOME',
        amount: Math.abs(amount),
        category: 'DEPOSIT',
        description: description || `Kassa kirim: ${type || 'CASH'} ${currency || 'UZS'}`,
        userId: req.user!.id,
        userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
      }
    });
    res.json({ success: true, message: 'Kassa muvaffaqiyatli toldirildi' });
  } catch (error) {
    console.error('Add money error:', error);
    res.status(500).json({ error: 'Kassa toldirishda xatolik' });
  }
});

router.post('/withdraw', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER', 'SELLER'), async (req: AuthRequest, res) => {
  try {
    const { amount, currency, type, description } = req.body;
    await prisma.cashboxTransaction.create({
      data: {
        type: 'EXPENSE',
        amount: Math.abs(amount),
        category: 'WITHDRAWAL',
        description: description || `Kassa chiqim: ${type || 'CASH'} ${currency || 'UZS'}`,
        userId: req.user!.id,
        userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
      }
    });
    res.json({ success: true, message: 'Chiqim muvaffaqiyatli amalga oshirildi' });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: 'Kassa chiqimida xatolik' });
  }
});

router.post('/transfer', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER', 'SELLER'), async (req: AuthRequest, res) => {
  try {
    const { from, to, amount, description, exchangeRate } = req.body;

    if (from === to) return res.status(400).json({ error: 'Bir xil tolov usullariga transfer qilib bolmaydi' });

    if (!amount || amount <= 0) return res.status(400).json({ error: 'Transfer miqdori musbat bolishi kerak' });

    // Use provided exchange rate or fall back to environment config
    const rate = exchangeRate || parseInt(process.env.USD_TO_UZS_RATE || '12500', 10);

    // Compute converted amount for the receiving side
    let toAmount = amount;
    if (from === 'USD' && to === 'UZS') {
      toAmount = amount * rate;
    } else if (from === 'UZS' && to === 'USD') {
      toAmount = amount / rate;
    }

    // Create withdrawal record (from) — store source currency
    await prisma.cashboxTransaction.create({
      data: {
        type: 'EXPENSE',
        amount: amount,
        currency: from,
        category: 'TRANSFER',
        description: description || `Transfer: ${amount} ${from} -> ${toAmount.toFixed(2)} ${to} (kurs: ${rate})`,
        userId: req.user!.id,
        userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
      }
    });

    // Create deposit record (to) — store target currency and converted amount
    await prisma.cashboxTransaction.create({
      data: {
        type: 'INCOME',
        amount: toAmount,
        currency: to,
        category: 'TRANSFER',
        description: description || `Transfer: ${amount} ${from} -> ${toAmount.toFixed(2)} ${to} (kurs: ${rate})`,
        userId: req.user!.id,
        userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
      }
    });

    res.json({ success: true, message: 'Transfer muvaffaqiyatli amalga oshirildi' });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ error: 'Transfer amalga oshirishda xatolik' });
  }
});

// Valyuta ayirboshlash endpointi
router.post('/exchange', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER', 'SELLER'), async (req: AuthRequest, res) => {
  try {
    const { fromCurrency, toCurrency, amount, fromType, toType, exchangeRate, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Miqdor musbat bolishi kerak' });
    }

    if (fromCurrency === toCurrency) {
      return res.status(400).json({ error: 'Bir xil valyutalarni ayirboshlab bolmaydi' });
    }

    const rate = exchangeRate || parseInt(process.env.USD_TO_UZS_RATE || '12500', 10);
    let receivedAmount: number;

    // Ayirboshlash hisoblash
    if (fromCurrency === 'USD' && toCurrency === 'UZS') {
      receivedAmount = amount * rate;
    } else if (fromCurrency === 'UZS' && toCurrency === 'USD') {
      receivedAmount = amount / rate;
    } else {
      return res.status(400).json({ error: 'Qo\'llab-quvvatlanmaydigan valyuta juftligi' });
    }

    // 1. Chiqim tranzaksiyasi (fromCurrency)
    await prisma.cashboxTransaction.create({
      data: {
        type: 'EXPENSE',
        amount: amount,
        category: 'EXCHANGE',
        description: description || `Ayirboshlash: ${amount} ${fromCurrency} -> ${receivedAmount.toFixed(2)} ${toCurrency} (kurs: ${rate})`,
        userId: req.user!.id,
        userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
      }
    });

    // 2. Kirim tranzaksiyasi (toCurrency)
    await prisma.cashboxTransaction.create({
      data: {
        type: 'INCOME',
        amount: receivedAmount,
        category: 'EXCHANGE',
        description: description || `Ayirboshlash: ${amount} ${fromCurrency} -> ${receivedAmount.toFixed(2)} ${toCurrency} (kurs: ${rate})`,
        userId: req.user!.id,
        userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
      }
    });

    res.json({
      success: true,
      message: 'Valyuta ayirboshlash muvaffaqiyatli amalga oshirildi',
      data: {
        fromAmount: amount,
        fromCurrency,
        toAmount: receivedAmount,
        toCurrency,
        exchangeRate: rate
      }
    });
  } catch (error) {
    console.error('Exchange error:', error);
    res.status(500).json({ error: 'Valyuta ayirboshlashda xatolik' });
  }
});

router.get('/export/pdf', async (req: AuthRequest, res) => {
  try {
    res.json({ message: 'PDF eksport tez orada qoshiladi' });
  } catch (error) {
    res.status(500).json({ error: 'PDF eksport xatolik' });
  }
});

router.get('/export/excel', async (req: AuthRequest, res) => {
  try {
    res.json({ message: 'Excel eksport tez orada qoshiladi' });
  } catch (error) {
    res.status(500).json({ error: 'Excel eksport xatolik' });
  }
});

// ==================== LOANS API ====================

// Qarzlarni olish
router.get('/loans', async (req: AuthRequest, res) => {
  try {
    // Loan modelida `employee` relation yo'q (faqat scalar employeeName/employeeId)
    const loans = await prisma.loan.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(loans);
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Qarzlarni olishda xatolik' });
  }
});

// Yangi qarz yaratish
router.post('/loans', async (req: AuthRequest, res) => {
  try {
    const {
      employeeName,
      employeeId,
      amount,
      currency,
      purpose,
      loanDate,
      dueDate,
      repaymentType,
      monthlyDeduction,
      notes
    } = req.body;

    const loan = await prisma.loan.create({
      data: {
        employeeName,
        employeeId: employeeId || null,
        amount: parseFloat(amount),
        currency: currency || 'UZS',
        purpose: purpose || '',
        loanDate: loanDate ? new Date(loanDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        repaymentType: repaymentType || 'SALARY_DEDUCTION',
        monthlyDeduction: monthlyDeduction ? parseFloat(monthlyDeduction) : null,
        notes: notes || '',
        remainingAmount: parseFloat(amount),
        status: 'ACTIVE'
      }
    });

    res.json({ success: true, loan });
  } catch (error) {
    console.error('Create loan error:', error);
    res.status(500).json({ error: 'Qarz yaratishda xatolik' });
  }
});

// ==================== BUDGETS API ====================

// Byudjetlarni olish
router.get('/budgets', async (req: AuthRequest, res) => {
  try {
    const { month, year } = req.query;

    const where: any = {};
    if (month) where.month = parseInt(month as string);
    if (year) where.year = parseInt(year as string);

    const budgets = await prisma.budget.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Har bir byudjet uchun sarflangan summani hisoblash
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const startOfMonth = new Date(budget.year, budget.month - 1, 1);
        const endOfMonth = new Date(budget.year, budget.month, 0);

        const expenses = await prisma.expense.aggregate({
          where: {
            category: budget.category,
            createdAt: {
              gte: startOfMonth,
              lte: endOfMonth
            }
          },
          _sum: { amount: true }
        });

        return {
          ...budget,
          spent: expenses._sum.amount || 0,
          remaining: budget.amount - (expenses._sum.amount || 0)
        };
      })
    );

    res.json(budgetsWithSpent);
  } catch (error) {
    console.error('Get budgets error:', error);
    res.status(500).json({ error: 'Byudjetlarni olishda xatolik' });
  }
});

// Yangi byudjet yaratish
router.post('/budgets', async (req: AuthRequest, res) => {
  try {
    const {
      category,
      amount,
      currency,
      month,
      year,
      alertThreshold,
      description
    } = req.body;

    const amountNum = parseFloat(amount);
    if (!category || !Number.isFinite(amountNum) || !month || !year) {
      return res.status(400).json({ error: 'category, amount, month, year majburiy' });
    }

    const budget = await prisma.budget.create({
      data: {
        category,
        amount: amountNum,
        currency: currency || 'UZS',
        month: parseInt(month),
        year: parseInt(year),
        alertThreshold: alertThreshold ? parseFloat(alertThreshold) : 80,
        spent: 0,
        remaining: amountNum,            // schema majburiy: yaratishda spent=0 -> remaining=amount
        createdBy: req.user?.id || 'system', // schema majburiy
        description: description || null
      }
    });

    res.json({ success: true, budget });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Byudjet yaratishda xatolik' });
  }
});

export default router;

// ==================== AUDIT ENDPOINTS ====================

// Kassa tarixini olish
router.get('/history', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate, userId, action, limit } = req.query;
    
    const { getCashboxHistory } = await import('../utils/cashbox-audit');
    
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (userId) filters.userId = userId as string;
    if (action) filters.action = action as string;
    if (limit) filters.limit = parseInt(limit as string);
    
    const history = await getCashboxHistory(filters);
    res.json(history);
  } catch (error) {
    console.error('Get cashbox history error:', error);
    res.status(500).json({ error: 'Kassa tarixini olishda xatolik' });
  }
});

// Kassa statistikasini olish
router.get('/audit-stats', async (req: AuthRequest, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const { getCashboxAuditStats } = await import('../utils/cashbox-audit');
    
    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;
    
    const stats = await getCashboxAuditStats(start, end);
    res.json(stats);
  } catch (error) {
    console.error('Get cashbox stats error:', error);
    res.status(500).json({ error: 'Kassa statistikasini olishda xatolik' });
  }
});

// Shubhali kassa faoliyatini aniqlash
router.get('/suspicious-activity', async (req: AuthRequest, res) => {
  try {
    const { userId } = req.query;
    
    const { detectSuspiciousActivity } = await import('../utils/cashbox-audit');
    
    const suspicious = await detectSuspiciousActivity(userId as string);
    res.json(suspicious);
  } catch (error) {
    console.error('Detect suspicious cashbox activity error:', error);
    res.status(500).json({ error: 'Shubhali faoliyatni aniqlashda xatolik' });
  }
});

// Tranzaksiya tarixini olish
router.get('/transaction-history/:entityId', async (req: AuthRequest, res) => {
  try {
    const { entityId } = req.params;
    
    const { getTransactionHistory } = await import('../utils/cashbox-audit');
    
    const history = await getTransactionHistory(entityId);
    res.json(history);
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({ error: 'Tranzaksiya tarixini olishda xatolik' });
  }
});
