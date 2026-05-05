import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { OrderWorkflow } from '../services/order-workflow';

const router = Router();

router.use(authenticate);

// Barcha yetkazib berishlarni olish (eski Delivery model)
router.get('/deliveries', async (req, res) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(deliveries);
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// Yetkazib berish yaratish
router.post('/deliveries', authorize('ADMIN', 'LOGISTICS_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { saleId, address, scheduledDate, driverId, notes } = req.body;

    const delivery = await prisma.delivery.create({
      data: {
        saleId,
        address,
        scheduledDate: new Date(scheduledDate),
        driverId,
        status: 'PENDING',
        notes
      }
    });

    res.json(delivery);
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({ error: 'Failed to create delivery' });
  }
});

// Yetkazib berish holatini yangilash
router.put('/deliveries/:id/status', authorize('ADMIN', 'LOGISTICS_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updateData: any = { status };

    if (status === 'DELIVERED') {
      updateData.deliveredDate = new Date();
    }

    const delivery = await prisma.delivery.update({
      where: { id },
      data: updateData
    });

    res.json(delivery);
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ error: 'Failed to update delivery status' });
  }
});

// Haydovchilar
router.get('/drivers', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(drivers);
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Haydovchi yaratish
router.post('/drivers', authorize('ADMIN', 'LOGISTICS_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { name, phone, licenseNumber, vehicleNumber } = req.body;

    const driver = await prisma.driver.create({
      data: {
        name,
        phone,
        licenseNumber,
        vehicleNumber,
        active: true
      }
    });

    res.json(driver);
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// Haydovchi holatini yangilash
router.put('/drivers/:id/status', authorize('ADMIN', 'LOGISTICS_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const driver = await prisma.driver.update({
      where: { id },
      data: { active }
    });

    res.json(driver);
  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
});

// Buyurtmalar uchun yetkazib berish
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ['READY_FOR_DELIVERY', 'DELIVERED'] }
      },
      include: {
        customer: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Buyurtmani yetkazildi deb belgilash
router.put('/orders/:id/deliver', authorize('ADMIN', 'LOGISTICS_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Workflow'ga yetkazib berish tugaganini xabar berish
    await OrderWorkflow.onDeliveryCompleted(id);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true }
    });

    res.json(order);
  } catch (error) {
    console.error('Deliver order error:', error);
    res.status(500).json({ error: 'Failed to deliver order' });
  }
});

// ============ STATISTICS ENDPOINT ============

// Logistika statistikasi
router.get('/statistics', async (req, res) => {
  try {
    const [
      totalDeliveries,
      pendingDeliveries,
      inProgressDeliveries,
      completedDeliveries,
      totalDrivers,
      activeDrivers,
      totalVehicles,
      activeVehicles
    ] = await Promise.all([
      prisma.delivery.count(),
      prisma.delivery.count({ where: { status: 'PENDING' } }),
      prisma.delivery.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.delivery.count({ where: { status: 'COMPLETED' } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { active: true } }),
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { active: true } })
    ]);

    res.json({
      deliveries: {
        total: totalDeliveries,
        pending: pendingDeliveries,
        inProgress: inProgressDeliveries,
        completed: completedDeliveries
      },
      drivers: {
        total: totalDrivers,
        active: activeDrivers
      },
      vehicles: {
        total: totalVehicles,
        active: activeVehicles
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============ VEHICLES ENDPOINTS ============

// Barcha transport vositalarini olish
router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        driver: true
      }
    });
    res.json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

// Transport vositasi yaratish
router.post('/vehicles', authorize('ADMIN', 'LOGISTICS_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { 
      name, 
      plateNumber, 
      type, 
      capacity,
      driverId 
    } = req.body;

    const vehicle = await prisma.vehicle.create({
      data: {
        name,
        plateNumber,
        type: type || 'TRUCK',
        capacity: capacity || 0,
        driverId: driverId || null,
        active: true
      },
      include: {
        driver: true
      }
    });

    res.json(vehicle);
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

export default router;