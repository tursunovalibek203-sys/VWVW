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

export default router;