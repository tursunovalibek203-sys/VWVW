import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { DriverBotManager } from '../bot/driver-bot';

const router = Router();

// Barcha driver endpointlari autentifikatsiya talab qiladi (driver PII himoyasi)
router.use(authenticate);

// Barcha haydovchilarni olish
router.get('/', async (req, res) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        user: { select: { name: true, login: true } },
        _count: {
          select: {
            assignments: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(drivers);
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Haydovchi yaratish
router.post('/', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { 
      name, 
      phone, 
      licenseNumber, 
      vehicleNumber, 
      login, 
      password,
      telegramBotToken 
    } = req.body;

    // Avval User yaratish
    let user = null;
    if (login && password) {
      user = await prisma.user.create({
        data: {
          login,
          password, // Haqiqiy loyihada hash qilish kerak
          name,
          role: 'DRIVER'
        }
      });
    }

    // Haydovchi yaratish
    const driver = await prisma.driver.create({
      data: {
        userId: user?.id,
        name,
        phone,
        licenseNumber,
        vehicleNumber,
        status: 'AVAILABLE'
      },
      include: {
        user: { select: { name: true, login: true } }
      }
    });

    // Agar bot token berilgan bo'lsa, botni ishga tushirish
    if (telegramBotToken) {
      await DriverBotManager.initDriverBot(driver.id, telegramBotToken);
    }

    res.json(driver);
  } catch (error) {
    console.error('Create driver error:', error);
    res.status(500).json({ error: 'Failed to create driver' });
  }
});

// Haydovchi ma'lumotlarini yangilash
router.put('/:id', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const driver = await prisma.driver.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { name: true, login: true } }
      }
    });

    res.json(driver);
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({ error: 'Failed to update driver' });
  }
});

// Haydovchi holatini yangilash
router.put('/:id/status', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const driver = await prisma.driver.update({
      where: { id },
      data: { status }
    });

    res.json(driver);
  } catch (error) {
    console.error('Update driver status error:', error);
    res.status(500).json({ error: 'Failed to update driver status' });
  }
});

// Haydovchiga buyurtma tayinlash
router.post('/:id/assign-order', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id: driverId } = req.params;
    const { orderId } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Admin ID not found' });
    }

    const assignment = await DriverBotManager.assignOrderToDriver(orderId, driverId, adminId);
    
    if (!assignment) {
      return res.status(400).json({ error: 'Failed to assign order' });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({ error: 'Failed to assign order' });
  }
});

// Haydovchi buyurtmalarini olish
router.get('/:id/assignments', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const whereClause: any = { driverId: id };
    if (status) {
      whereClause.status = status;
    }

    const assignments = await prisma.deliveryAssignment.findMany({
      where: whereClause,
      include: {
        order: {
          include: { customer: true }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// Haydovchi joylashuvini olish
router.get('/:id/location', async (req, res) => {
  try {
    const { id } = req.params;

    const location = await prisma.driverLocation.findFirst({
      where: { driverId: id },
      orderBy: { timestamp: 'desc' }
    });

    res.json(location);
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
});

// Haydovchi joylashuv tarixi
router.get('/:id/location-history', async (req, res) => {
  try {
    const { id } = req.params;
    const { from, to } = req.query;

    const whereClause: any = { driverId: id };
    
    if (from || to) {
      whereClause.timestamp = {};
      if (from) whereClause.timestamp.gte = new Date(from as string);
      if (to) whereClause.timestamp.lte = new Date(to as string);
    }

    const locations = await prisma.driverLocation.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: 100 // Oxirgi 100 ta joylashuv
    });

    res.json(locations);
  } catch (error) {
    console.error('Get location history error:', error);
    res.status(500).json({ error: 'Failed to fetch location history' });
  }
});

// Haydovchi statistikasi
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { id }
    });

    const totalAssignments = await prisma.deliveryAssignment.count({
      where: { driverId: id }
    });

    const completedAssignments = await prisma.deliveryAssignment.count({
      where: { driverId: id, status: 'COMPLETED' }
    });

    const todayAssignments = await prisma.deliveryAssignment.count({
      where: {
        driverId: id,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    const monthAssignments = await prisma.deliveryAssignment.count({
      where: {
        driverId: id,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    });

    const avgRating = await prisma.deliveryAssignment.aggregate({
      where: { driverId: id, status: 'COMPLETED' },
      _avg: { actualTime: true }
    });

    const stats = {
      driver,
      totalAssignments,
      completedAssignments,
      todayAssignments,
      monthAssignments,
      completionRate: totalAssignments > 0 ? (completedAssignments / totalAssignments * 100) : 0,
      avgDeliveryTime: avgRating._avg.actualTime || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Haydovchi chat xabarlari
router.get('/:id/chat', async (req, res) => {
  try {
    const { id } = req.params;

    const messages = await prisma.driverChat.findMany({
      where: { driverId: id },
      include: {
        admin: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(messages);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
});

// Admin haydovchiga xabar yuborish
router.post('/:id/chat', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id: driverId } = req.params;
    const { message } = req.body;
    const adminId = req.user?.id;

    if (!adminId) {
      return res.status(401).json({ error: 'Admin ID not found' });
    }

    // Chat xabarini saqlash
    const chatMessage = await prisma.driverChat.create({
      data: {
        driverId,
        adminId,
        message,
        senderType: 'ADMIN'
      }
    });

    // Haydovchiga Telegram orqali yuborish
    const driver = await prisma.driver.findUnique({
      where: { id: driverId }
    });

    if (driver?.telegramChatId) {
      // Bu yerda haydovchi botiga xabar yuborish logikasi bo'ladi
      console.log(`💬 Admin xabari haydovchiga: ${message}`);
    }

    res.json(chatMessage);
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Haydovchi botini ishga tushirish
router.post('/:id/start-bot', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { botToken } = req.body;

    const bot = await DriverBotManager.initDriverBot(id, botToken);
    
    if (bot) {
      res.json({ success: true, message: 'Bot ishga tushirildi' });
    } else {
      res.status(400).json({ error: 'Bot ishga tushmadi' });
    }
  } catch (error) {
    console.error('Start bot error:', error);
    res.status(500).json({ error: 'Failed to start bot' });
  }
});

// Haydovchi botini to'xtatish
router.post('/:id/stop-bot', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    DriverBotManager.stopDriverBot(id);
    res.json({ success: true, message: 'Bot to\'xtatildi' });
  } catch (error) {
    console.error('Stop bot error:', error);
    res.status(500).json({ error: 'Failed to stop bot' });
  }
});

// Bitta haydovchini olish (GET by ID) - API test uchun
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, login: true } },
        assignments: {
          include: {
            order: {
              include: { customer: true }
            }
          },
          orderBy: { assignedAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            assignments: {
              where: { status: 'COMPLETED' }
            }
          }
        }
      }
    });

    if (!driver) {
      return res.status(404).json({ error: 'Haydovchi topilmadi' });
    }

    res.json(driver);
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({ error: 'Failed to fetch driver' });
  }
});

// Haydovchini o'chirish
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Botni to'xtatish
    DriverBotManager.stopDriverBot(id);

    // Haydovchini o'chirish
    await prisma.driver.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Haydovchi o\'chirildi' });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({ error: 'Failed to delete driver' });
  }
});

// Haydovchini tekshirish va yaratish (savdadan foydalanish uchun)
router.post('/check-or-create', async (req, res) => {
  try {
    const { name, phone, vehicleNumber } = req.body;

    // Validatsiya
    if (!name || !phone) {
      return res.status(400).json({ error: 'Ism va telefon raqami majburiy' });
    }

    // Telefon raqami bo'yicha haydovchini qidirish
    let driver = await prisma.driver.findFirst({
      where: { phone }
    });

    if (driver) {
      // Haydovchi mavjud, qaytarish
      res.json(driver);
    } else {
      // Yangi haydovchi yaratish
      driver = await prisma.driver.create({
        data: {
          name,
          phone,
          vehicleNumber: vehicleNumber || '',
          status: 'AVAILABLE'
        }
      });
      res.json(driver);
    }
  } catch (error) {
    console.error('Check or create driver error:', error);
    res.status(500).json({ error: 'Failed to check or create driver' });
  }
});

// ── Haydovchi pul topshirdi: USD + UZS + Karta bir vaqtda ──────────────────
router.post('/:id/payment', authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { amountUSD = 0, amountUZS = 0, amountKarta = 0, exchangeRate = 12700, notes } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || req.user?.login || 'Admin';

    const usd   = parseFloat(amountUSD)   || 0;
    const uzs   = parseFloat(amountUZS)   || 0;
    const karta = parseFloat(amountKarta) || 0;
    const rate  = parseFloat(exchangeRate) || 12700;

    if (usd <= 0 && uzs <= 0 && karta <= 0) {
      return res.status(400).json({ error: 'Kamida bitta summa kiritilishi kerak' });
    }

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    // Jami UZS ekvivalenti (qarz kamaytirish uchun)
    const totalInUZS = (usd * rate) + uzs + karta;
    const newDebt = Math.max(0, (driver.debtToCompany || 0) - totalInUZS);
    await (prisma.driver as any).update({ where: { id }, data: { debtToCompany: newDebt } });

    const desc = `Haydovchi to'lovi: ${driver.name}${notes ? ' (' + notes + ')' : ''}`;

    // Kassaga kirim — har valyuta alohida
    if (usd > 0) {
      await prisma.cashboxTransaction.create({ data: {
        type: 'INCOME', amount: usd, currency: 'USD', category: 'INCOME',
        paymentMethod: 'CASH', description: desc, userId: userId || '', userName, reference: id,
      }});
    }
    if (uzs > 0) {
      await prisma.cashboxTransaction.create({ data: {
        type: 'INCOME', amount: uzs, currency: 'UZS', category: 'INCOME',
        paymentMethod: 'CASH', description: desc, userId: userId || '', userName, reference: id,
      }});
    }
    if (karta > 0) {
      await prisma.cashboxTransaction.create({ data: {
        type: 'INCOME', amount: karta, currency: 'UZS', category: 'INCOME',
        paymentMethod: 'CARD', description: desc, userId: userId || '', userName, reference: id,
      }});
    }

    res.json({ success: true, driverName: driver.name, totalInUZS, remainingDebt: newDebt });
  } catch (error: any) {
    console.error('Driver payment error:', error);
    res.status(500).json({ error: 'Haydovchi to\'lovida xatolik: ' + error.message });
  }
});

// ── Haydovchi qarzini bekor qilish (kassaga pul tushmaydi) ────────────────
// amount = undefined → to'liq bekor; amount > 0 → qisman bekor
router.post('/:id/cancel-debt', authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { note = '', amount } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || req.user?.login || 'Admin';

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    const currentDebt = driver.debtToCompany || 0;
    const partialAmount = amount !== undefined ? parseFloat(amount) || 0 : 0;
    const cancelledAmount = partialAmount > 0 ? Math.min(partialAmount, currentDebt) : currentDebt;
    const newDebt = Math.max(0, currentDebt - cancelledAmount);

    await (prisma.driver as any).update({ where: { id }, data: { debtToCompany: newDebt } });

    const isPartial = newDebt > 0;
    const desc = `Haydovchi qarzi ${isPartial ? "qisman" : "to'liq"} bekor: ${driver.name} — ${Math.round(cancelledAmount).toLocaleString()} UZS${note ? ' (' + note + ')' : ''}`;

    // Faqat loglash — kassaga pul tushmaydi
    await prisma.cashboxTransaction.create({ data: {
      type: 'EXPENSE', amount: 0.01, currency: 'UZS', category: 'ADJUSTMENT',
      paymentMethod: 'CASH', description: desc,
      userId: userId || '', userName, reference: id,
    }});

    res.json({ success: true, cancelledAmount, remainingDebt: newDebt, driverName: driver.name });
  } catch (error: any) {
    console.error('Driver cancel-debt error:', error);
    res.status(500).json({ error: 'Qarzni bekor qilishda xatolik: ' + error.message });
  }
});

// ── Haydovchi sotuv qarzlari (debtToCompany va sotuvlar) ─────────────────────
router.get('/:id/debt-summary', async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, debtToCompany: true } as any,
    });
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    const pendingSales = await prisma.sale.findMany({
      where: { driverId: id, driverPaymentStatus: 'COLLECTED' },
      select: { id: true, createdAt: true, driverCollectedAmount: true, currency: true,
        customer: { select: { name: true } }, manualCustomerName: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ driver, pendingSales });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;