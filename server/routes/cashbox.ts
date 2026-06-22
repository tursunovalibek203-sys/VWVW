import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { DecimalHelper } from '../utils/decimal-helper';
import { withCache, invalidateCache } from '../middleware/responseCache';
import { TelegramUserService } from '../services/TelegramUserService';

function fmtAmt(amount: number, currency: string) {
  return currency === 'USD' ? `$${amount.toLocaleString()}` : `${amount.toLocaleString()} UZS`;
}

function notifyKassa(type: 'INCOME' | 'EXPENSE', amount: number, currency: string, method: string, description: string, userName: string) {
  const emoji = type === 'INCOME' ? '📥' : '📤';
  const label = type === 'INCOME' ? 'Kirim' : 'Chiqim';
  const methodMap: Record<string, string> = { CASH: 'Naqd', CARD: 'Karta', USD: 'Dollar', CLICK: 'Click', PAYME: 'Payme', TRANSFER: "O'tkazma" };
  const text = [
    `${emoji} *${label}* — LuxPetPlast`,
    ``,
    `💵 Summa: ${fmtAmt(amount, currency)}`,
    `💳 Usul: ${methodMap[method] || method}`,
    description ? `📝 Izoh: ${description}` : '',
    `👤 ${userName}`,
    `🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`,
  ].filter(Boolean).join('\n');

  TelegramUserService.sendToKassaTopic(text).catch(() => {});
}

const router = Router();

router.use(authenticate);

router.get('/summary', withCache(30 * 1000), async (req, res) => {
  try {
    const now   = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekAgo    = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);

    // ── DB-level aggregations — no full table scan in JS ──────────────────
    const [
      totalAgg,
      todayAgg,
      monthAgg,
      txCount,
      currencyRaw,
      weeklyRaw,
      todayBreakdownRaw,
      monthBreakdownRaw,
    ] = await Promise.all([
      // Jami kirim/chiqim
      prisma.cashboxTransaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
      }),
      // Bugungi kirim/chiqim
      prisma.cashboxTransaction.groupBy({
        by: ['type'],
        where: { createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      // Oylik kirim/chiqim
      prisma.cashboxTransaction.groupBy({
        by: ['type'],
        where: { createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      // Tranzaksiyalar soni (kassa bo'sh ekanligini bilish uchun)
      prisma.cashboxTransaction.count(),
      // Valyuta + to'lov usuli bo'yicha qoldiq (SQL)
      prisma.$queryRaw<Array<{
        type: string; currency: string; paymentMethod: string; total: number;
      }>>`
        SELECT type, COALESCE("currency",'UZS') AS currency,
               COALESCE("paymentMethod",'CASH') AS "paymentMethod",
               COALESCE(SUM(amount),0) AS total
        FROM "CashboxTransaction"
        GROUP BY type, "currency", "paymentMethod"
      `,
      // Haftalik kirim/chiqim (SQL da GROUP BY sana)
      prisma.$queryRaw<Array<{ day: string; type: string; total: number }>>`
        SELECT "createdAt"::date AS day, type,
               COALESCE(SUM(amount),0) AS total
        FROM "CashboxTransaction"
        WHERE "createdAt" >= ${weekAgo}::timestamptz
        GROUP BY "createdAt"::date, type
        ORDER BY day ASC
      `,
      // Bugungi kirim/chiqim valyuta + usul bo'yicha
      prisma.$queryRaw<Array<{
        type: string; currency: string; paymentMethod: string; total: number;
      }>>`
        SELECT type, COALESCE("currency",'UZS') AS currency,
               COALESCE("paymentMethod",'CASH') AS "paymentMethod",
               COALESCE(SUM(amount),0) AS total
        FROM "CashboxTransaction"
        WHERE "createdAt" >= ${today}::timestamptz
        GROUP BY type, "currency", "paymentMethod"
      `,
      // Oylik kirim/chiqim valyuta + usul bo'yicha
      prisma.$queryRaw<Array<{
        type: string; currency: string; paymentMethod: string; total: number;
      }>>`
        SELECT type, COALESCE("currency",'UZS') AS currency,
               COALESCE("paymentMethod",'CASH') AS "paymentMethod",
               COALESCE(SUM(amount),0) AS total
        FROM "CashboxTransaction"
        WHERE "createdAt" >= ${monthStart}::timestamptz
        GROUP BY type, "currency", "paymentMethod"
      `,
    ]);

    const getAgg = (rows: { type: string; _sum: { amount: number | null } }[], t: string) =>
      rows.find(r => r.type === t)?._sum?.amount ?? 0;

    // Agar cashboxTransaction mavjud bo'lsa — ular asosiy manba
    let totalIncome   = getAgg(totalAgg  as any, 'INCOME');
    let totalExpense  = getAgg(totalAgg  as any, 'EXPENSE');
    let todayIncome   = getAgg(todayAgg  as any, 'INCOME');
    let todayExpense  = getAgg(todayAgg  as any, 'EXPENSE');
    let monthlyIncome = getAgg(monthAgg  as any, 'INCOME');
    let monthlyExpense= getAgg(monthAgg  as any, 'EXPENSE');

    // Fallback — agar kassa bo'sh bo'lsa (eski ma'lumotlar)
    if (txCount === 0) {
      const [saleAgg, payAgg, expAgg] = await Promise.all([
        prisma.sale.aggregate({
          where: { paymentStatus: { in: ['PAID', 'PARTIAL'] } },
          _sum: { paidAmount: true },
        }),
        prisma.payment.aggregate({ _sum: { amount: true } }),
        prisma.expense.aggregate({ _sum: { amount: true } }),
      ]);
      totalIncome  = (saleAgg._sum.paidAmount ?? 0) + (payAgg._sum.amount ?? 0);
      totalExpense = expAgg._sum.amount ?? 0;
      todayIncome = monthlyIncome = 0;
      todayExpense = monthlyExpense = 0;
    }

    const totalBalance = totalIncome - totalExpense;

    // ── Valyuta qoldiqlari (cashboxTransactions dan) ─────────────────────
    let cashUZS = 0, cashUSD = 0, cardUZS = 0, clickUZS = 0;
    (currencyRaw as any[]).forEach(row => {
      const sign   = row.type === 'INCOME' ? 1 : -1;
      const amount = Number(row.total);
      const method = (row.paymentMethod || 'CASH').toUpperCase();
      const curr   = (row.currency     || 'UZS').toUpperCase();

      if (method === 'CLICK') {
        clickUZS += sign * amount;
      } else if (method === 'CARD') {
        cardUZS  += sign * amount;
      } else if (curr === 'USD') {
        cashUSD  += sign * amount;
      } else {
        cashUZS  += sign * amount;
      }
    });

    // ── Haftalik oqim (cashboxTransactions dan) ──────────────────────────
    const dailyFlow = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(today); d.setDate(d.getDate() - i);
      const ds  = d.toISOString().slice(0, 10);
      const inc = (weeklyRaw as any[])
        .filter(r => r.day === ds && r.type === 'INCOME')
        .reduce((s, r) => s + Number(r.total), 0);
      const exp = (weeklyRaw as any[])
        .filter(r => r.day === ds && r.type === 'EXPENSE')
        .reduce((s, r) => s + Number(r.total), 0);
      dailyFlow.push({
        date: d.toLocaleDateString('uz-UZ', { month: 'short', day: 'numeric' }),
        income: Math.round(inc),
        expense: Math.round(exp),
        net: Math.round(inc - exp),
      });
    }

    const exchangeRate = parseInt(process.env.USD_TO_UZS_RATE || '12500', 10);
    const totalUSD = (cashUZS + clickUZS + cardUZS) / exchangeRate + cashUSD;

    // Valyuta bo'yicha breakdown ni hisoblash
    const parseBreakdown = (rows: any[], txType: string) => {
      let cashUZS = 0, cardUZS = 0, clickUZS = 0, cashUSD = 0;
      rows.filter((r: any) => r.type === txType).forEach((r: any) => {
        const amt = Number(r.total);
        const method = (r.paymentMethod || 'CASH').toUpperCase();
        const curr   = (r.currency     || 'UZS').toUpperCase();
        if (method === 'CLICK')    clickUZS += amt;
        else if (method === 'CARD') cardUZS += amt;
        else if (curr === 'USD')   cashUSD  += amt;
        else                       cashUZS  += amt;
      });
      return { cashUZS, cardUZS, clickUZS, cashUSD };
    };

    const todayIncomeBy  = parseBreakdown(todayBreakdownRaw  as any[], 'INCOME');
    const todayExpenseBy = parseBreakdown(todayBreakdownRaw  as any[], 'EXPENSE');
    const monthIncomeBy  = parseBreakdown(monthBreakdownRaw  as any[], 'INCOME');
    const monthExpenseBy = parseBreakdown(monthBreakdownRaw  as any[], 'EXPENSE');

    // Jami (all-time) kirim va chiqim — valyuta+usul bo'yicha (currencyRaw dan)
    const totalIncomeBy  = parseBreakdown(currencyRaw as any[], 'INCOME');
    const totalExpenseBy = parseBreakdown(currencyRaw as any[], 'EXPENSE');

    res.json({
      totalBalance,
      totalUSD,
      todayIncome,
      todayExpense,
      monthlyIncome,
      monthlyExpense,
      byCurrency: { cashUZS, cashUSD, cardUZS, clickUZS },
      totalIncomeBy,
      totalExpenseBy,
      dailyFlow,
      todayIncomeBy,
      todayExpenseBy,
      monthIncomeBy,
      monthExpenseBy,
    });
  } catch (error) {
    console.error('Cashbox summary error:', error);
    res.status(500).json({ error: 'Kassa malumotlarini yuklashda xatolik' });
  }
});

router.get('/transactions', withCache(20 * 1000), async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 200;
    const { type, paymentMethod, startDate, endDate } = req.query;

    const where: any = {};
    if (type && type !== 'ALL') where.type = type as string;
    if (paymentMethod && paymentMethod !== 'ALL') where.paymentMethod = paymentMethod as string;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const txs = await prisma.cashboxTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(txs);
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: 'Tranzaksiyalarni yuklashda xatolik' });
  }
});

router.post('/add', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER', 'SELLER'), async (req: AuthRequest, res) => {
  try {
    const { amount, currency, paymentMethod, type, description } = req.body;
    const parsedAmt = parseFloat(amount);
    if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      return res.status(400).json({ error: 'Summa musbat son bo\'lishi kerak' });
    }
    const method = paymentMethod || type || 'CASH';
    const resolvedCurrency = method === 'CARD' ? 'UZS' : (currency || 'UZS');
    const userName = (req.user as any)?.name || req.user?.email || 'Noma\'lum';
    await prisma.cashboxTransaction.create({
      data: {
        type: 'INCOME',
        amount: parsedAmt,
        currency: resolvedCurrency,
        paymentMethod: method,
        category: 'DEPOSIT',
        description: description || `Kassa kirim: ${method} ${resolvedCurrency}`,
        userId: req.user!.id,
        userName,
      }
    });
    invalidateCache('/api/cashbox');
    invalidateCache('/api/dashboard');
    notifyKassa('INCOME', parsedAmt, resolvedCurrency, method, description || '', userName);
    res.json({ success: true, message: 'Kassa muvaffaqiyatli toldirildi' });
  } catch (error) {
    console.error('Add money error:', error);
    res.status(500).json({ error: 'Kassa toldirishda xatolik' });
  }
});

router.post('/withdraw', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER', 'SELLER'), async (req: AuthRequest, res) => {
  try {
    const { amount, currency, paymentMethod, type, description } = req.body;
    const parsedAmt = parseFloat(amount);
    if (!Number.isFinite(parsedAmt) || parsedAmt <= 0) {
      return res.status(400).json({ error: 'Summa musbat son bo\'lishi kerak' });
    }
    const method = paymentMethod || type || 'CASH';
    const resolvedCurrency = method === 'CARD' ? 'UZS' : (currency || 'UZS');
    const userName = (req.user as any)?.name || req.user?.email || 'Noma\'lum';
    await prisma.cashboxTransaction.create({
      data: {
        type: 'EXPENSE',
        amount: parsedAmt,
        currency: resolvedCurrency,
        paymentMethod: method,
        category: 'WITHDRAWAL',
        description: description || `Kassa chiqim: ${method} ${resolvedCurrency}`,
        userId: req.user!.id,
        userName,
      }
    });
    invalidateCache('/api/cashbox');
    invalidateCache('/api/dashboard');
    notifyKassa('EXPENSE', parsedAmt, resolvedCurrency, method, description || '', userName);
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
    if (!rate || rate <= 0 || !Number.isFinite(rate)) {
      return res.status(400).json({ error: 'Noto\'g\'ri kurs qiymati' });
    }

    // Compute converted amount for the receiving side
    let toAmount = amount;
    if (from === 'USD' && to === 'UZS') {
      toAmount = Math.round(amount * rate * 100) / 100;
    } else if (from === 'UZS' && to === 'USD') {
      toAmount = Math.round((amount / rate) * 100) / 100;
    }

    const desc = description || `Transfer: ${amount} ${from} -> ${toAmount.toFixed(2)} ${to} (kurs: ${rate})`;
    // Both legs in one atomic transaction — if second fails, first is rolled back
    await prisma.$transaction([
      prisma.cashboxTransaction.create({
        data: {
          type: 'EXPENSE', amount, currency: from, category: 'TRANSFER', description: desc,
          userId: req.user!.id, userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
        },
      }),
      prisma.cashboxTransaction.create({
        data: {
          type: 'INCOME', amount: toAmount, currency: to, category: 'TRANSFER', description: desc,
          userId: req.user!.id, userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
        },
      }),
    ]);

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
    if (!rate || rate <= 0 || !Number.isFinite(rate) || rate > 50_000) {
      return res.status(400).json({ error: 'Kurs 0 dan katta va 50 000 dan kichik bo\'lishi shart' });
    }
    let receivedAmount: number;

    // Ayirboshlash hisoblash — round to 2 decimal places to avoid float precision issues
    if (fromCurrency === 'USD' && toCurrency === 'UZS') {
      receivedAmount = Math.round(amount * rate * 100) / 100;
    } else if (fromCurrency === 'UZS' && toCurrency === 'USD') {
      receivedAmount = Math.round((amount / rate) * 100) / 100;
    } else {
      return res.status(400).json({ error: 'Qo\'llab-quvvatlanmaydigan valyuta juftligi' });
    }

    const exchDesc = description || `Ayirboshlash: ${amount} ${fromCurrency} -> ${receivedAmount.toFixed(2)} ${toCurrency} (kurs: ${rate})`;
    // Both legs atomic — if either fails the other is rolled back
    await prisma.$transaction([
      prisma.cashboxTransaction.create({
        data: {
          type: 'EXPENSE', amount, currency: fromCurrency,
          paymentMethod: fromType || 'CASH', category: 'EXCHANGE', description: exchDesc,
          userId: req.user!.id, userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
        },
      }),
      prisma.cashboxTransaction.create({
        data: {
          type: 'INCOME', amount: receivedAmount, currency: toCurrency,
          paymentMethod: toType || 'CASH', category: 'EXCHANGE', description: exchDesc,
          userId: req.user!.id, userName: (req.user as any)?.name || req.user?.email || 'Noma\'lum',
        },
      }),
    ]);

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

    if (!employeeName || !String(employeeName).trim()) {
      return res.status(400).json({ error: 'Xodim ismi kiritilishi shart' });
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Summa musbat son bo\'lishi kerak' });
    }
    const resolvedCurrency = currency || 'UZS';
    const isAdvance = repaymentType === 'ADVANCE';

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          employeeName,
          employeeId: employeeId || null,
          amount: parsedAmount,
          currency: resolvedCurrency,
          purpose: purpose || '',
          loanDate: loanDate ? new Date(loanDate) : new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          repaymentType: repaymentType || 'SALARY_DEDUCTION',
          monthlyDeduction: monthlyDeduction ? parseFloat(monthlyDeduction) : null,
          notes: notes || '',
          remainingAmount: parsedAmount,
          status: 'ACTIVE'
        }
      });

      // Kassadan chiqim qilish (avans yoki qarz berilganda)
      await tx.cashboxTransaction.create({
        data: {
          type: 'EXPENSE',
          amount: parsedAmount,
          currency: resolvedCurrency,
          paymentMethod: 'CASH',
          category: isAdvance ? 'ADVANCE' : 'LOAN',
          description: isAdvance
            ? `Avans: ${employeeName}${purpose ? ' - ' + purpose : ''}`
            : `Qarz: ${employeeName}${purpose ? ' - ' + purpose : ''}`,
          userId: req.user!.id,
          userName: (req.user as any)?.name || req.user?.email || 'Admin',
          reference: loan.id,
        }
      });

      return loan;
    });

    res.json({ success: true, loan: result });
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
        const startOfMonth = new Date(budget.year, budget.month - 1, 1, 0, 0, 0, 0);
        const endOfMonth   = new Date(budget.year, budget.month, 0, 23, 59, 59, 999);

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
    if (!category || !Number.isFinite(amountNum) || amountNum <= 0 || !month || !year) {
      return res.status(400).json({ error: 'category, amount, month, year majburiy (amount > 0)' });
    }
    const parsedYear  = parseInt(year);
    const parsedMonth = parseInt(month);

    // Compute current month's actual spending so update doesn't reset remaining
    const mStart = new Date(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0);
    const mEnd   = new Date(parsedYear, parsedMonth,     0, 23, 59, 59, 999);
    const agg = await prisma.expense.aggregate({
      where: { category, createdAt: { gte: mStart, lte: mEnd } },
      _sum: { amount: true },
    });
    const currentSpent   = agg._sum.amount || 0;
    const newRemaining   = Math.max(0, amountNum - currentSpent);

    const budget = await prisma.budget.upsert({
      where: { category_year_month: { category, year: parsedYear, month: parsedMonth } },
      update: {
        amount: amountNum,
        currency: currency || 'UZS',
        alertThreshold: alertThreshold ? parseFloat(alertThreshold) : 80,
        spent: currentSpent,
        remaining: newRemaining,
        description: description || null,
      },
      create: {
        category,
        amount: amountNum,
        currency: currency || 'UZS',
        month: parsedMonth,
        year: parsedYear,
        alertThreshold: alertThreshold ? parseFloat(alertThreshold) : 80,
        spent: currentSpent,
        remaining: newRemaining,
        createdBy: req.user?.id || 'system',
        description: description || null,
      },
    });

    res.json({ success: true, budget });
  } catch (error) {
    console.error('Create budget error:', error);
    res.status(500).json({ error: 'Byudjet yaratishda xatolik' });
  }
});

// ==================== LOAN REPAYMENT ====================

router.post('/loans/:id/repay', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { amount, currency, paymentMethod, notes, exchangeRate: clientRate } = req.body;

    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Summa musbat son bo\'lishi kerak' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id } });
      if (!loan) throw Object.assign(new Error(), { code: 'LOAN_NOT_FOUND' });
      if (loan.status === 'PAID' || loan.status === 'CANCELLED') {
        throw Object.assign(new Error(), { code: 'LOAN_ALREADY_PAID' });
      }

      const loanCurrency = loan.currency || 'UZS';
      const repayCurrency = currency || loanCurrency;

      // Valyuta farqi bo'lsa — kurs majburiy
      let amountInLoanCurrency = parsedAmount;
      let conversionRate = 0;
      if (repayCurrency !== loanCurrency) {
        conversionRate = parseFloat(clientRate);
        if (!Number.isFinite(conversionRate) || conversionRate <= 0 || conversionRate > 50_000) {
          throw Object.assign(new Error(), { code: 'RATE_REQUIRED' });
        }
        if (repayCurrency === 'USD' && loanCurrency === 'UZS') {
          amountInLoanCurrency = DecimalHelper.round(parsedAmount * conversionRate, 2);
        } else if (repayCurrency === 'UZS' && loanCurrency === 'USD') {
          amountInLoanCurrency = DecimalHelper.round(parsedAmount / conversionRate, 2);
        }
      }

      // Ortiqcha to'lovni qirqib tashlash (overpayment prevention)
      const actualRepayment = Math.min(amountInLoanCurrency, loan.remainingAmount);
      const newRemaining   = DecimalHelper.round(
        DecimalHelper.subtract(loan.remainingAmount, actualRepayment), 2
      );
      const capped   = actualRepayment < amountInLoanCurrency;
      const newStatus: 'ACTIVE' | 'PAID' = newRemaining <= 0 ? 'PAID' : 'ACTIVE';

      // Kassa yozuviga qo'yiladigan summa: repayCurrency'dagi haqiqiy to'langan miqdor
      // (overpayment bo'lsa qirqilgan qism hisobga olinmaydi)
      let amountInRepayCurrency: number;
      if (!capped) {
        amountInRepayCurrency = parsedAmount;
      } else if (repayCurrency === loanCurrency) {
        amountInRepayCurrency = actualRepayment;
      } else if (repayCurrency === 'USD' && loanCurrency === 'UZS') {
        amountInRepayCurrency = DecimalHelper.round(actualRepayment / conversionRate, 6);
      } else {
        amountInRepayCurrency = DecimalHelper.round(actualRepayment * conversionRate, 2);
      }

      await tx.loan.update({
        where: { id },
        data: { remainingAmount: Math.max(0, newRemaining), status: newStatus },
      });

      const isAdvance = loan.repaymentType === 'ADVANCE';
      await tx.cashboxTransaction.create({
        data: {
          type: 'INCOME',
          amount: amountInRepayCurrency,
          currency: repayCurrency,
          paymentMethod: paymentMethod || 'CASH',
          category: isAdvance ? 'ADVANCE' : 'LOAN_REPAYMENT',
          description: notes || `${isAdvance ? 'Avans' : 'Qarz'} qaytarildi: ${loan.employeeName}`,
          userId: req.user!.id,
          userName: (req.user as any)?.name || req.user?.email || 'Admin',
          reference: id,
        },
      });

      return { newRemaining: Math.max(0, newRemaining), newStatus, capped };
    });

    res.json({
      success: true,
      message: result.newStatus === 'PAID' ? 'Qarz to\'liq qaytarildi!' : 'To\'lov qabul qilindi',
      capped: result.capped,
      newRemaining: result.newRemaining,
      fullyPaid: result.newStatus === 'PAID',
    });
  } catch (err: any) {
    const code = err?.code;
    if (code === 'LOAN_NOT_FOUND')    return res.status(404).json({ error: 'Qarz topilmadi' });
    if (code === 'LOAN_ALREADY_PAID') return res.status(400).json({ error: 'Bu qarz allaqachon to\'liq qaytarilgan' });
    if (code === 'RATE_REQUIRED')     return res.status(400).json({ error: 'Valyuta farqi bor — kurs kiritish shart (0 < kurs ≤ 50 000)' });
    console.error('Loan repay error:', err);
    res.status(500).json({ error: 'Qarz to\'lashda xatolik' });
  }
});

// ==================== TRANSACTION CANCELLATION ====================

router.post('/transactions/:id/cancel', authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Bekor qilish sababi ko\'rsatilishi shart' });
    }

    const original = await prisma.cashboxTransaction.findUnique({ where: { id } });
    if (!original) return res.status(404).json({ error: 'Tranzaksiya topilmadi' });

    // Ayirboshlash va transferni bekor qilib bo'lmaydi (ikkala tomoni bor)
    if (['EXCHANGE', 'TRANSFER'].includes(original.category || '')) {
      return res.status(400).json({ error: 'Ayirboshlash va transfer tranzaksiyalarini bekor qilib bo\'lmaydi' });
    }

    // Allaqachon reversal bo'lgan tranzaksiyani qayta bekor qilish mumkin emas
    if (original.category === 'REVERSAL') {
      return res.status(400).json({ error: 'Bu tranzaksiya allaqachon bekor qilingan (reversal)' });
    }

    // Allaqachon bekor qilinganini tekshirish (reference bo'yicha)
    const existing = await prisma.cashboxTransaction.findFirst({
      where: { reference: id, category: 'REVERSAL' },
    });
    if (existing) {
      return res.status(400).json({ error: 'Bu tranzaksiya allaqachon bekor qilingan' });
    }

    // Teskari tranzaksiya (reversal) — original o'chirilmaydi, audit trail saqlanadi
    const reversal = await prisma.cashboxTransaction.create({
      data: {
        type: original.type === 'INCOME' ? 'EXPENSE' : 'INCOME',
        amount: original.amount,
        currency: original.currency,
        paymentMethod: original.paymentMethod,
        category: 'REVERSAL',
        description: `Bekor qilindi: ${original.description || ''} | Sabab: ${reason.trim()}`,
        userId: req.user!.id,
        userName: (req.user as any)?.name || req.user?.email || 'Admin',
        reference: id,
      },
    });

    res.json({ success: true, message: 'Tranzaksiya bekor qilindi', reversal });
  } catch (error) {
    console.error('Cancel transaction error:', error);
    res.status(500).json({ error: 'Tranzaksiyani bekor qilishda xatolik' });
  }
});

// ==================== CASH RECONCILIATION ====================

router.post('/reconcile', authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const { physicalUZS, physicalUSD, reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Tekshiruv sababi ko\'rsatilishi shart' });
    }

    const pUZS = parseFloat(physicalUZS) || 0;
    const pUSD = parseFloat(physicalUSD) || 0;

    // Balance calculation and ADJUSTMENT creation in one atomic transaction
    // to prevent race condition between read and write
    const { systemUZS, systemUSD, diffUZS, diffUSD, adjCount } = await prisma.$transaction(async (tx) => {
      const allTxs = await tx.cashboxTransaction.findMany();
      let sUZS = 0, sUSD = 0;
      allTxs.forEach(t => {
        const sign = t.type === 'INCOME' ? 1 : -1;
        const method = t.paymentMethod || 'CASH';
        if (method === 'CASH' && t.currency === 'USD') sUSD += sign * t.amount;
        else if (method === 'CASH' && t.currency !== 'USD') sUZS += sign * t.amount;
      });

      const dUZS = DecimalHelper.round(pUZS - sUZS, 2);
      const dUSD = DecimalHelper.round(pUSD - sUSD, 6);
      let count = 0;

      if (Math.abs(dUZS) > 1) {
        await tx.cashboxTransaction.create({
          data: {
            type: dUZS > 0 ? 'INCOME' : 'EXPENSE',
            amount: Math.abs(dUZS),
            currency: 'UZS',
            paymentMethod: 'CASH',
            category: 'ADJUSTMENT',
            description: `Kassa tekshiruvi (UZS) | ${reason.trim()}`,
            userId: req.user!.id,
            userName: (req.user as any)?.name || 'Admin',
            reference: 'RECONCILIATION',
          },
        });
        count++;
      }
      if (Math.abs(dUSD) > 0.001) {
        await tx.cashboxTransaction.create({
          data: {
            type: dUSD > 0 ? 'INCOME' : 'EXPENSE',
            amount: Math.abs(dUSD),
            currency: 'USD',
            paymentMethod: 'CASH',
            category: 'ADJUSTMENT',
            description: `Kassa tekshiruvi (USD) | ${reason.trim()}`,
            userId: req.user!.id,
            userName: (req.user as any)?.name || 'Admin',
            reference: 'RECONCILIATION',
          },
        });
        count++;
      }

      return { systemUZS: sUZS, systemUSD: sUSD, diffUZS: dUZS, diffUSD: dUSD, adjCount: count };
    });

    res.json({
      success: true,
      message: adjCount > 0 ? 'Farqlar ADJUSTMENT sifatida qayd qilindi' : 'Kassa balansi to\'g\'ri — farq yo\'q',
      system: { UZS: systemUZS, USD: systemUSD },
      physical: { UZS: pUZS, USD: pUSD },
      diff: { UZS: diffUZS, USD: diffUSD },
      adjustments: adjCount,
    });
  } catch (error) {
    console.error('Reconcile error:', error);
    res.status(500).json({ error: 'Kassa tekshiruvida xatolik' });
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
