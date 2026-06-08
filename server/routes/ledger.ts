import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// GET /api/ledger?type=DRIVER
router.get('/', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { type, status } = req.query;
    const where: any = {};
    if (type && type !== 'ALL') where.type = type as string;
    if (status && status !== 'ALL') where.status = status as string;

    const now = new Date();

    // Persist OVERDUE status to DB for ledgers that are past due
    await prisma.ledger.updateMany({
      where: {
        status: 'ACTIVE',
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    });

    const ledgers = await prisma.ledger.findMany({
      where,
      include: { entries: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(ledgers);
  } catch (err) {
    console.error('Get ledgers error:', err);
    res.status(500).json({ error: 'Daftarlarni yuklashda xatolik' });
  }
});

// GET /api/ledger/:id  (full with all entries)
router.get('/:id', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const ledger = await prisma.ledger.findUnique({
      where: { id: req.params.id },
      include: { entries: { orderBy: { createdAt: 'desc' } } },
    });
    if (!ledger) return res.status(404).json({ error: 'Daftar topilmadi' });

    // Persist overdue if needed
    if (ledger.status === 'ACTIVE' && ledger.dueDate && new Date(ledger.dueDate) < now) {
      await prisma.ledger.update({ where: { id: req.params.id }, data: { status: 'OVERDUE' } });
      ledger.status = 'OVERDUE';
    }

    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: 'Daftarni yuklashda xatolik' });
  }
});

// POST /api/ledger  — create ledger
router.post('/', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { type, name, description, currency, dueDate, notes } = req.body;
    if (!type || !name) return res.status(400).json({ error: 'type va name majburiy' });

    const ledger = await prisma.ledger.create({
      data: {
        type,
        name,
        description: description || null,
        currency: currency || 'UZS',
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes || null,
        userId: req.user!.id,
      },
    });
    res.json(ledger);
  } catch (err) {
    console.error('Create ledger error:', err);
    res.status(500).json({ error: 'Daftar yaratishda xatolik' });
  }
});

// PUT /api/ledger/:id
router.put('/:id', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { name, description, currency, dueDate, notes, status } = req.body;
    const ledger = await prisma.ledger.update({
      where: { id: req.params.id },
      data: {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(currency    !== undefined && { currency }),
        ...(dueDate     !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(notes       !== undefined && { notes }),
        ...(status      !== undefined && { status }),
      },
    });
    res.json(ledger);
  } catch (err) {
    res.status(500).json({ error: 'Daftarni yangilashda xatolik' });
  }
});

// DELETE /api/ledger/:id
router.delete('/:id', authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    await prisma.ledger.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "O'chirishda xatolik" });
  }
});

// POST /api/ledger/:id/entries  — add debit or credit entry
router.post('/:id/entries', authorize('ADMIN', 'ACCOUNTANT', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { entryType, amount, currency, dueDate, paidDate, notes } = req.body;
    if (!entryType || !amount) return res.status(400).json({ error: 'entryType va amount majburiy' });
    if (!['DEBIT', 'CREDIT'].includes(entryType))
      return res.status(400).json({ error: 'entryType: DEBIT yoki CREDIT bolishi kerak' });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return res.status(400).json({ error: 'Summa musbat son bolishi kerak' });

    const ledger = await prisma.ledger.findUnique({ where: { id: req.params.id } });
    if (!ledger) return res.status(404).json({ error: 'Daftar topilmadi' });

    // Use transaction to add entry and update ledger totals atomically
    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.ledgerEntry.create({
        data: {
          ledgerId: req.params.id,
          entryType,
          amount: parsedAmount,
          currency: currency || ledger.currency,
          dueDate: dueDate ? new Date(dueDate) : null,
          paidDate: paidDate ? new Date(paidDate) : (entryType === 'CREDIT' ? new Date() : null),
          notes: notes || null,
          userId: req.user!.id,
        },
      });

      const newDebit  = entryType === 'DEBIT'  ? ledger.totalDebit  + parsedAmount : ledger.totalDebit;
      const newCredit = entryType === 'CREDIT' ? ledger.totalCredit + parsedAmount : ledger.totalCredit;
      const newBalance = newDebit - newCredit;
      // Preserve actual balance including negative (overpayment = OVERPAID status)
      const newStatus = newBalance <= 0 ? (newBalance < 0 ? 'OVERPAID' : 'PAID') : 'ACTIVE';

      const updated = await tx.ledger.update({
        where: { id: req.params.id },
        data: {
          totalDebit:  newDebit,
          totalCredit: newCredit,
          balance:     newBalance,
          status:      newStatus,
        },
        include: { entries: { orderBy: { createdAt: 'desc' } } },
      });

      return updated;
    });

    res.json(result);
  } catch (err) {
    console.error('Add ledger entry error:', err);
    res.status(500).json({ error: 'Yozuv qoshishda xatolik' });
  }
});

// DELETE /api/ledger/:id/entries/:entryId
router.delete('/:id/entries/:entryId', authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const entry = await prisma.ledgerEntry.findUnique({ where: { id: req.params.entryId } });
    if (!entry) return res.status(404).json({ error: 'Yozuv topilmadi' });

    const ledger = await prisma.ledger.findUnique({ where: { id: req.params.id } });
    if (!ledger) return res.status(404).json({ error: 'Daftar topilmadi' });

    await prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.delete({ where: { id: req.params.entryId } });

      const newDebit  = Math.max(0, entry.entryType === 'DEBIT'  ? ledger.totalDebit  - entry.amount : ledger.totalDebit);
      const newCredit = Math.max(0, entry.entryType === 'CREDIT' ? ledger.totalCredit - entry.amount : ledger.totalCredit);
      const newBalance = newDebit - newCredit;
      const newStatus = newBalance <= 0 ? (newBalance < 0 ? 'OVERPAID' : 'PAID') : 'ACTIVE';

      await tx.ledger.update({
        where: { id: req.params.id },
        data: {
          totalDebit:  newDebit,
          totalCredit: newCredit,
          balance:     newBalance,
          status:      newStatus,
        },
      });
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "O'chirishda xatolik" });
  }
});

export default router;
