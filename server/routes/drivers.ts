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

// Haydovchi yaratish — ADMIN, MANAGER, CASHIER va boshqa autentifikatsiya bo'lgan foydalanuvchilar
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, phone, licenseNumber, vehicleNumber, login, password, telegramBotToken } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Ism kiritilishi shart' });

    // Phone: bo'sh bo'lsa unique placeholder yaratamiz
    const phoneValue = phone?.trim() || `auto-${Date.now()}`;
    // vehicleNumber: ixtiyoriy
    const vehicleValue = vehicleNumber?.trim() || '';

    // Avval User yaratish (ixtiyoriy)
    let user = null;
    if (login?.trim() && password?.trim()) {
      const existing = await prisma.user.findFirst({ where: { login: login.trim() } });
      if (existing) return res.status(400).json({ error: "Bu login band, boshqa login tanlang" });
      user = await (prisma.user as any).create({
        data: { login: login.trim(), password: password.trim(), name: name.trim(), role: 'CASHIER' }
      });
    }

    // Telefon allaqachon mavjudligini tekshirish
    if (phone?.trim()) {
      const existingPhone = await (prisma.driver as any).findUnique({ where: { phone: phone.trim() } });
      if (existingPhone) return res.status(400).json({ error: "Bu telefon raqam allaqachon mavjud" });
    }

    const driver = await (prisma.driver as any).create({
      data: {
        userId: user?.id,
        name: name.trim(),
        phone: phoneValue,
        licenseNumber: licenseNumber?.trim() || null,
        vehicleNumber: vehicleValue,
        status: 'AVAILABLE',
        debtToCompany: 0,
        debtToCompanyUSD: 0,
      },
      include: { user: { select: { name: true, login: true } } }
    });

    if (telegramBotToken) {
      try { await DriverBotManager.initDriverBot(driver.id, telegramBotToken); } catch {}
    }

    res.json(driver);
  } catch (error: any) {
    console.error('Create driver error:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: "Bu ma'lumot allaqachon mavjud (telefon yoki login)" });
    }
    res.status(500).json({ error: 'Haydovchi qo\'shishda xatolik: ' + error.message });
  }
});

// Haydovchi ma'lumotlarini yangilash — barcha autentifikatsiya bo'lgan foydalanuvchilar
router.put('/:id', async (req: AuthRequest, res) => {
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
router.delete('/:id', async (req: AuthRequest, res) => {
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
    const { amountUSD = 0, amountUZS = 0, amountKarta = 0, exchangeRate = 12500, notes, saleIds } = req.body;
    const userId = req.user?.id || '';
    const userName = req.user?.name || 'Admin';

    const rate  = parseFloat(exchangeRate) || parseInt(process.env.USD_TO_UZS_RATE || '12500', 10);

    const driver = await (prisma.driver as any).findUnique({ where: { id } });
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    const desc = `Haydovchi to'lovi: ${driver.name}${notes ? ' (' + notes + ')' : ''}`;

    // ── Har bir mijoz uchun alohida to'lov rejimi ───────────────────────────
    if (Array.isArray(saleIds) && saleIds.length > 0) {
      const salesToPay = await prisma.sale.findMany({
        where: { id: { in: saleIds }, driverId: id, driverPaymentStatus: 'PENDING' },
        select: { id: true, currency: true, driverCollectedAmount: true, totalAmount: true },
      });

      if (salesToPay.length === 0) {
        return res.status(400).json({ error: 'Tanlangan savdolar topilmadi' });
      }

      const paidUSD = salesToPay
        .filter(s => s.currency === 'USD')
        .reduce((sum, s) => sum + (Number(s.driverCollectedAmount) || Number(s.totalAmount) || 0), 0);
      const paidUZS = salesToPay
        .filter(s => s.currency === 'UZS')
        .reduce((sum, s) => sum + (Number(s.driverCollectedAmount) || Number(s.totalAmount) || 0), 0);

      await prisma.$transaction(async (tx) => {
        // Tanlangan savdolarni DELIVERED + PAID qilish
        await tx.sale.updateMany({
          where: { id: { in: salesToPay.map(s => s.id) } },
          data: { driverPaymentStatus: 'DELIVERED', paymentStatus: 'PAID' },
        });

        // Driver qarzini kamaytirish
        const newDebtUSD = Math.max(0, (driver.debtToCompanyUSD || 0) - paidUSD);
        const newDebtUZS = Math.max(0, (driver.debtToCompany || 0) - paidUZS);

        await tx.$executeRaw`
          UPDATE "Driver"
          SET "debtToCompanyUSD" = ${newDebtUSD},
              "debtToCompany"    = ${newDebtUZS},
              "updatedAt"        = NOW()
          WHERE "id" = ${id}
        `;

        // Kassaga kirim
        if (paidUSD > 0) {
          await tx.cashboxTransaction.create({ data: {
            type: 'INCOME', amount: paidUSD, currency: 'USD', category: 'PAYMENT',
            paymentMethod: 'CASH', description: desc, userId, userName, reference: id,
          }});
        }
        if (paidUZS > 0) {
          await tx.cashboxTransaction.create({ data: {
            type: 'INCOME', amount: paidUZS, currency: 'UZS', category: 'PAYMENT',
            paymentMethod: 'CASH', description: desc, userId, userName, reference: id,
          }});
        }
      });

      return res.json({
        success: true,
        driverName: driver.name,
        paid: { usd: paidUSD, uzs: paidUZS, karta: 0 },
        paidSalesCount: salesToPay.length,
        remainingDebtUSD: Math.max(0, (driver.debtToCompanyUSD || 0) - paidUSD),
        remainingDebtUZS: Math.max(0, (driver.debtToCompany || 0) - paidUZS),
      });
    }

    // ── Eski rejim: manual summa kiritish (FIFO) ────────────────────────────
    const usd   = parseFloat(amountUSD)   || 0;
    const uzs   = parseFloat(amountUZS)   || 0;
    const karta = parseFloat(amountKarta) || 0;

    if (usd <= 0 && uzs <= 0 && karta <= 0) {
      return res.status(400).json({ error: 'Kamida bitta summa kiritilishi kerak' });
    }

    // Atomik: driver qarz kamaytirish + kassaga kirim + sotuvlarni PAID belgilash
    await prisma.$transaction(async (tx) => {
      // USD qarz kamayadi
      const newDebtUSD = Math.max(0, (driver.debtToCompanyUSD || 0) - usd);
      // UZS qarz: uzs + karta + USD ekvivalenti (eski data uchun backward-compatible)
      const newDebtUZS = Math.max(0, (driver.debtToCompany || 0) - (uzs + karta + usd * rate));

      await tx.$executeRaw`
        UPDATE "Driver"
        SET "debtToCompanyUSD" = ${newDebtUSD},
            "debtToCompany"    = ${newDebtUZS},
            "updatedAt"        = NOW()
        WHERE "id" = ${id}
      `;

      // USD sotuvlarni DELIVERED + PAID belgilash (FIFO)
      if (usd > 0) {
        const usdSales = await tx.sale.findMany({
          where: { driverId: id, driverPaymentStatus: 'PENDING', currency: 'USD' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, driverCollectedAmount: true },
        });
        let remaining = usd;
        for (const sale of usdSales) {
          if (remaining <= 0) break;
          const saleAmt = (sale.driverCollectedAmount as any) || 0;
          if (saleAmt <= remaining) {
            await tx.sale.update({
              where: { id: sale.id },
              data: { driverPaymentStatus: 'DELIVERED', paymentStatus: 'PAID' },
            });
            remaining -= saleAmt;
          }
        }
      }

      // UZS sotuvlarni DELIVERED + PAID belgilash (FIFO)
      if (uzs + karta > 0) {
        const uzsSales = await tx.sale.findMany({
          where: { driverId: id, driverPaymentStatus: 'PENDING', currency: 'UZS' },
          orderBy: { createdAt: 'asc' },
          select: { id: true, driverCollectedAmount: true },
        });
        let remaining = uzs + karta;
        for (const sale of uzsSales) {
          if (remaining <= 0) break;
          const saleAmt = (sale.driverCollectedAmount as any) || 0;
          if (saleAmt <= remaining) {
            await tx.sale.update({
              where: { id: sale.id },
              data: { driverPaymentStatus: 'DELIVERED', paymentStatus: 'PAID' },
            });
            remaining -= saleAmt;
          }
        }
      }

      // Kassaga kirim — har valyuta alohida
      if (usd > 0) {
        await tx.cashboxTransaction.create({ data: {
          type: 'INCOME', amount: usd, currency: 'USD', category: 'PAYMENT',
          paymentMethod: 'CASH', description: desc, userId, userName, reference: id,
        }});
      }
      if (uzs > 0) {
        await tx.cashboxTransaction.create({ data: {
          type: 'INCOME', amount: uzs, currency: 'UZS', category: 'PAYMENT',
          paymentMethod: 'CASH', description: desc, userId, userName, reference: id,
        }});
      }
      if (karta > 0) {
        await tx.cashboxTransaction.create({ data: {
          type: 'INCOME', amount: karta, currency: 'UZS', category: 'PAYMENT',
          paymentMethod: 'CARD', description: desc, userId, userName, reference: id,
        }});
      }
    });

    res.json({
      success: true,
      driverName: driver.name,
      paid: { usd, uzs, karta },
      remainingDebtUZS: Math.max(0, (driver.debtToCompany || 0) - (uzs + karta)),
      remainingDebtUSD: Math.max(0, (driver.debtToCompanyUSD || 0) - usd),
    });
  } catch (error: any) {
    console.error('Driver payment error:', error);
    res.status(500).json({ error: 'Haydovchi to\'lovida xatolik: ' + error.message });
  }
});

// ── Haydovchi qarzini bekor qilish → qarz avtomatik mijozlarga o'tkaziladi ────
// saleIds = [] → barcha pending; saleIds = ['id1','id2'] → faqat tanlangan sotuvlar
router.post('/:id/cancel-debt', authorize('ADMIN', 'MANAGER', 'CASHIER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { note = '', saleIds } = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name || req.user?.login || 'Admin';

    const driver = await prisma.driver.findUnique({ where: { id } });
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    // Agar saleIds berilgan bo'lsa — faqat shu sotuvlar, aks holda barcha PENDING
    const saleFilter: any = { driverId: id, driverPaymentStatus: 'PENDING' };
    if (Array.isArray(saleIds) && saleIds.length > 0) {
      saleFilter.id = { in: saleIds };
    }

    // Haydovchining PENDING sotuvlarini topamiz
    const pendingSales = await prisma.sale.findMany({
      where: saleFilter,
      select: {
        id: true, currency: true, driverCollectedAmount: true,
        customerId: true, manualCustomerName: true,
        customer: { select: { id: true, name: true } },
      },
    });

    let transferredUZS = 0;
    let transferredUSD = 0;
    const affectedCustomers: string[] = [];

    await prisma.$transaction(async (tx) => {
      for (const sale of pendingSales) {
        const amt = (sale.driverCollectedAmount as any) || 0;
        if (amt <= 0) continue;

        if (sale.currency === 'USD') {
          // USD qarzni mijozga o'tkazamiz
          if (sale.customerId) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: { debtUSD: { increment: amt } },
            });
            if (sale.customer?.name && !affectedCustomers.includes(sale.customer.name))
              affectedCustomers.push(sale.customer.name);
          }
          transferredUSD += amt;
        } else {
          // UZS qarzni mijozga o'tkazamiz
          if (sale.customerId) {
            await tx.customer.update({
              where: { id: sale.customerId },
              data: { debtUZS: { increment: Math.round(amt) } },
            });
            if (sale.customer?.name && !affectedCustomers.includes(sale.customer.name))
              affectedCustomers.push(sale.customer.name);
          }
          transferredUZS += amt;
        }

        // Sotuvni haydovchidan ajratamiz: UNPAID + CANCELLED status
        await tx.sale.update({
          where: { id: sale.id },
          data: { driverPaymentStatus: 'CANCELLED', paymentStatus: 'UNPAID' },
        });
      }

      // Haydovchi qarzini kamaytirish (o'tkazilgan summalar bo'yicha)
      await tx.$executeRaw`
        UPDATE "Driver"
        SET "debtToCompany"    = GREATEST(0, "debtToCompany"    - ${transferredUZS}),
            "debtToCompanyUSD" = GREATEST(0, "debtToCompanyUSD" - ${transferredUSD}),
            "updatedAt" = NOW()
        WHERE "id" = ${id}
      `;

      const customerNote = affectedCustomers.length > 0
        ? ` → ${affectedCustomers.join(', ')} ga o'tkazildi`
        : '';
      const desc = `Haydovchi qarzi bekor qilindi: ${driver.name}${customerNote}${note ? ' (' + note + ')' : ''}`;

      await tx.cashboxTransaction.create({ data: {
        type: 'EXPENSE', amount: 0.01, currency: 'UZS', category: 'ADJUSTMENT',
        paymentMethod: 'CASH', description: desc,
        userId: userId || '', userName, reference: id,
      }});
    });

    res.json({
      success: true,
      driverName: driver.name,
      transferredUZS,
      transferredUSD,
      affectedCustomers,
      affectedSales: pendingSales.length,
    });
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
      where: { driverId: id, driverPaymentStatus: 'PENDING' },
      select: {
        id: true, createdAt: true, driverCollectedAmount: true, currency: true,
        customerId: true, manualCustomerName: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ driver, pendingSales });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ── DB migration: debtToCompany dan USD ekvivalentini tozalash ───────────────
// Bu endpoint bir marta chaqiriladi: POST /api/drivers/migrate/fix-debt
router.post('/migrate/fix-debt', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { exchangeRate = 12700 } = req.body;
    const rate = parseFloat(exchangeRate) || 12700;

    // Barcha driverlarning debtToCompany dan debtToCompanyUSD*rate ni ayiramiz
    const result = await prisma.$executeRaw`
      UPDATE "Driver"
      SET "debtToCompany" = GREATEST(0, "debtToCompany" - ("debtToCompanyUSD" * ${rate})),
          "updatedAt" = NOW()
      WHERE "debtToCompanyUSD" > 0
        AND "debtToCompany" > 0
    `;

    res.json({ success: true, updatedDrivers: result, rate });
  } catch (error: any) {
    res.status(500).json({ error: 'Migration xatolik: ' + error.message });
  }
});

export default router;