import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { OrderWorkflow } from '../services/order-workflow';

const router = Router();

router.use(authenticate);

// Main production endpoint (for test compatibility)
router.get('/', async (req, res) => {
  try {
    const orders = await prisma.productionOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    console.error('Get production error:', error);
    res.status(500).json({ error: 'Failed to fetch production orders' });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.productionOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch production orders' });
  }
});

router.post('/orders', authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.id;
    const {
      productId,
      targetQuantity,
      quantity, // frontend (Orders.tsx) bu nom bilan yuboradi
      plannedDate,
      shift,
      supervisorId,
      notes,
    } = req.body;

    // Contract: frontend faqat { productId, quantity, notes } yuboradi.
    // Operatsion maydonlar uchun oqilona default'lar (model ularni majburiy qiladi).
    const resolvedQuantity = Number(targetQuantity ?? quantity);
    if (!productId || !Number.isFinite(resolvedQuantity) || resolvedQuantity <= 0) {
      return res.status(400).json({ error: 'productId va musbat quantity (yoki targetQuantity) majburiy' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { name: true },
    });
    if (!product) {
      return res.status(404).json({ error: 'Mahsulot topilmadi' });
    }

    const orderNumber = `PRD-${Date.now()}`;

    const order = await prisma.productionOrder.create({
      data: {
        orderNumber,
        productId,
        targetQuantity: resolvedQuantity,
        plannedDate: plannedDate ? new Date(plannedDate) : new Date(),
        shift: shift || 'DAY',
        supervisorId: supervisorId || userId || 'system',
        notes: notes || null,
      },
    });

    // Frontend response.data.productName ni o'qiydi
    res.json({ ...order, productName: product.name });
  } catch (error) {
    console.error('Create production order error:', error);
    res.status(500).json({ error: 'Failed to create production order' });
  }
});

router.put('/orders/:id/status', authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req, res) => {
  try {
    const { status, actualQuantity } = req.body;
    const updateData: any = { status };

    if (status === 'IN_PROGRESS') {
      updateData.startedDate = new Date();
    } else if (status === 'COMPLETED') {
      updateData.completedDate = new Date();
      
      if (actualQuantity) {
        updateData.actualQuantity = actualQuantity;
      }
      
      // Update product stock when production is completed
      const order = await prisma.productionOrder.findUnique({
        where: { id: req.params.id },
      });
      
      if (order) {
        await prisma.product.update({
          where: { id: order.productId },
          data: { currentStock: { increment: actualQuantity || order.targetQuantity } },
        });

        // Workflow'ga ishlab chiqarish tugaganini xabar berish
        await OrderWorkflow.onProductionCompleted(req.params.id);
      }
    }

    const updatedOrder = await prisma.productionOrder.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update production order status' });
  }
});

// ── Batch (partiyalar) endpointlar ────────────────────────────────────────────

router.get('/batches', async (req, res) => {
  try {
    const { productId, startDate, endDate, limit = '100', offset = '0' } = req.query;

    const where: any = {};
    if (productId) where.productId = productId as string;
    if (startDate || endDate) {
      where.productionDate = {};
      if (startDate) where.productionDate.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.productionDate.lte = end;
      }
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        orderBy: { productionDate: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
        include: { product: { select: { id: true, name: true, unit: true } } },
      }),
      prisma.batch.count({ where }),
    ]);

    res.json({ batches, total });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({ error: 'Partiyalarni yuklashda xatolik' });
  }
});

router.post('/batches', authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { productId, quantity, productionDate, shift, responsiblePerson } = req.body;

    if (!productId || !quantity || quantity <= 0) {
      return res.status(400).json({ error: 'productId va musbat quantity majburiy' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });
    if (!product) return res.status(404).json({ error: 'Mahsulot topilmadi' });

    const batch = await prisma.$transaction(async tx => {
      const b = await tx.batch.create({
        data: {
          productId,
          quantity: parseInt(quantity),
          productionDate: productionDate ? new Date(productionDate) : new Date(),
          shift: shift || 'Kunduzgi',
          responsiblePerson: responsiblePerson || (req.user as any)?.name || 'Noma\'lum',
        },
      });
      // Stok yangilash
      await tx.product.update({
        where: { id: productId },
        data: { currentStock: { increment: parseInt(quantity) } },
      });
      return b;
    });

    res.json({ ...batch, productName: product.name });
  } catch (error) {
    console.error('Create batch error:', error);
    res.status(500).json({ error: 'Partiya yaratishda xatolik' });
  }
});

// Haftalik/oylik statistika
router.get('/batches/stats', async (req, res) => {
  try {
    const now   = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const weekAgo  = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, weekAgg, monthAgg, byProduct, weeklyTrend] = await Promise.all([
      prisma.batch.aggregate({
        where: { productionDate: { gte: today } },
        _sum: { quantity: true }, _count: { id: true },
      }),
      prisma.batch.aggregate({
        where: { productionDate: { gte: weekAgo } },
        _sum: { quantity: true }, _count: { id: true },
      }),
      prisma.batch.aggregate({
        where: { productionDate: { gte: monthStart } },
        _sum: { quantity: true }, _count: { id: true },
      }),
      // Mahsulot bo'yicha oylik
      prisma.batch.groupBy({
        by: ['productId'],
        where: { productionDate: { gte: monthStart } },
        _sum: { quantity: true },
        _count: { id: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      // Haftalik grafik
      prisma.$queryRaw<Array<{ day: string; total: number; batches: number }>>`
        SELECT "productionDate"::date AS day,
               COALESCE(SUM(quantity),0) AS total,
               COUNT(*) AS batches
        FROM "Batch"
        WHERE "productionDate" >= ${weekAgo}::timestamptz
        GROUP BY "productionDate"::date
        ORDER BY day ASC
      `,
    ]);

    // Top mahsulotlar nomi
    const productIds = byProduct.map(p => p.productId);
    const productNames = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(productNames.map(p => [p.id, p.name]));

    // Haftalik grafik (7 kun)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d   = new Date(today); d.setDate(d.getDate() - i);
      const ds  = d.toISOString().slice(0, 10);
      const row = (weeklyTrend as any[]).find(r => r.day === ds);
      weeklyData.push({
        day:     d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
        date:    ds,
        total:   row ? Number(row.total)   : 0,
        batches: row ? Number(row.batches) : 0,
        isToday: i === 0,
      });
    }

    res.json({
      today:  { qty: todayAgg._sum.quantity ?? 0, count: todayAgg._count.id },
      week:   { qty: weekAgg._sum.quantity  ?? 0, count: weekAgg._count.id  },
      month:  { qty: monthAgg._sum.quantity ?? 0, count: monthAgg._count.id },
      topProducts: byProduct.map(p => ({
        productId: p.productId,
        name:      nameMap.get(p.productId) ?? 'Noma\'lum',
        qty:       p._sum.quantity ?? 0,
        batches:   p._count.id,
      })),
      weeklyTrend: weeklyData,
    });
  } catch (error) {
    console.error('Batch stats error:', error);
    res.status(500).json({ error: 'Partiya statistikasida xatolik' });
  }
});

export default router;