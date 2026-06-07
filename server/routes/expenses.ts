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

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          amount: Math.abs(parseFloat(amount)),
          currency: resolvedCurrency,
          category: category || 'OTHER',
          description: description || `Xarajat: ${category || 'OTHER'}`,
          userId: req.user!.id,
        },
      });

      // Mirror every expense into cashboxTransaction so totals stay in sync
      await tx.cashboxTransaction.create({
        data: {
          type: 'EXPENSE',
          amount: Math.abs(parseFloat(amount)),
          currency: resolvedCurrency,
          paymentMethod: paymentMethod || 'CASH',
          category: category || 'OTHER',
          description: description || `Xarajat: ${category}`,
          userId: req.user!.id,
          userName: (req.user as any)?.name || 'Admin',
          reference: created.id,
        },
      });

      return created;
    });

    res.json(expense);
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
