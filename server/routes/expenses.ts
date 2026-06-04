import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Only ADMIN and ACCOUNTANT can view expense details
router.get(
  '/',
  authorize('ADMIN', 'ACCOUNTANT'),
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

router.post('/', authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const { amount, currency, category, description } = req.body;

    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'Summa musbat son bo\'lishi kerak' });
    }

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: { ...req.body, userId: req.user!.id },
      });

      // Mirror every expense into cashboxTransaction so totals stay in sync
      await tx.cashboxTransaction.create({
        data: {
          type: 'EXPENSE',
          amount: Math.abs(parseFloat(amount)),
          currency: currency || 'UZS',
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
