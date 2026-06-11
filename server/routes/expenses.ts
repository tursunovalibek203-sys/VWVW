import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// ADMIN, ACCOUNTANT, and CASHIER can view expenses
router.get(
  '/',
  authorize('ADMIN', 'ACCOUNTANT', 'CASHIER'),
  async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate, category, currency } = req.query;
      const where: any = {};

      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }
      if (category) where.category = category;
      if (currency) where.currency = currency;

      const expenses = await prisma.expense.findMany({
        where,
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });

      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch expenses' });
    }
  }
);

router.post('/', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { amount, currency, category, description, paymentMethod } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Summa musbat son bo\'lishi kerak' });
    }

    // Karta faqat UZS bo'lishi kerak
    const resolvedCurrency = paymentMethod === 'CARD' ? 'UZS' : (currency || 'UZS');

    const absAmount = Math.abs(parseFloat(amount));
    const cat = category || 'OTHER';
    const now = new Date();

    const { expense, budgetWarning, budgetInfo } = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          amount: absAmount,
          currency: resolvedCurrency,
          category: cat,
          description: description || `Xarajat: ${cat}`,
          userId: req.user!.id,
        },
      });

      await tx.cashboxTransaction.create({
        data: {
          type: 'EXPENSE',
          amount: absAmount,
          currency: resolvedCurrency,
          paymentMethod: paymentMethod || 'CASH',
          category: cat,
          description: description || `Xarajat: ${cat}`,
          userId: req.user!.id,
          userName: (req.user as any)?.name || 'Admin',
          reference: created.id,
        },
      });

      // Budjet yangilash va ogohlantirish — transaction ichida (atomik)
      // Haqiqiy sarflangan summa expense jadvalidan hisoblanadi (GET /cashbox/budgets bilan mos)
      let warning = false;
      let info: any = null;
      const budget = await tx.budget.findUnique({
        where: { category_year_month: { category: cat, year: now.getFullYear(), month: now.getMonth() + 1 } },
      });
      if (budget) {
        // Expense hozir yaratildi — aggregate uни o'z ichiga oladi
        const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const mEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const agg = await tx.expense.aggregate({
          where: { category: cat, createdAt: { gte: mStart, lte: mEnd } },
          _sum: { amount: true },
        });
        const newSpent = agg._sum.amount || 0;
        const prevSpent = Math.max(0, newSpent - absAmount);
        if (newSpent > budget.amount) {
          warning = true;
          info = { category: cat, allocated: budget.amount, spent: prevSpent, newTotal: newSpent, over: newSpent - budget.amount, currency: budget.currency };
        }
        await tx.budget.update({
          where: { id: budget.id },
          data: { spent: newSpent, remaining: Math.max(0, budget.amount - newSpent) },
        });
      }

      return { expense: created, budgetWarning: warning, budgetInfo: info };
    });

    // Real-time backup yangilash
    setImmediate(async () => {
      try {
        const { generateDailyExcelBackup } = await import('../utils/daily-excel-backup.js');
        await generateDailyExcelBackup();
      } catch { /* silent */ }
    });

    res.json({ ...expense, budgetWarning, budgetInfo });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Summary also restricted — shows total spend by category
router.get(
  '/summary',
  authorize('ADMIN', 'ACCOUNTANT'),
  async (req: AuthRequest, res) => {
    try {
      const { startDate, endDate } = req.query;
      const where: any = {};

      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string),
        };
      }

      const expenses = await prisma.expense.groupBy({
        by: ['category', 'currency'],
        where,
        _sum: { amount: true },
      });

      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  }
);

export default router;
