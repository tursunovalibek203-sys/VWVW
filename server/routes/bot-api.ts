import { Router } from 'express';
import { botManager } from '../bot/bot-manager';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { prisma } from '../utils/prisma';
import crypto from 'crypto';

const router = Router();

// 🔒 Webhook Secret tekshiruvi middleware
const verifyTelegramWebhook = (req: any, res: any, next: any) => {
  // X-Telegram-Bot-API-Secret-Token header'ini tekshirish
  const webhookSecret = req.headers['x-telegram-bot-api-secret-token'];
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  
  if (process.env.NODE_ENV === 'production' && expectedSecret) {
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.warn('❌ Invalid webhook secret from IP:', req.ip);
      return res.sendStatus(403);
    }
  }
  next();
};

// Bot holatini tekshirish
router.get('/status', authenticate, async (req, res) => {
  try {
    const healthReport = await botManager.checkBotHealth();
    res.json({
      success: true,
      data: healthReport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Bot status error:', error);
    res.status(500).json({ error: 'Bot holatini tekshirishda xatolik' });
  }
});

// Barcha botlar ro'yxati
router.get('/list', authenticate, async (req, res) => {
  try {
    const bots = botManager.getAllBots();
    const botList = bots.map(([name, bot]) => ({
      name,
      active: !!bot,
      type: getBotType(name)
    }));

    res.json({
      success: true,
      data: {
        bots: botList,
        totalCount: botManager.getBotCount()
      }
    });
  } catch (error) {
    console.error('Bot list error:', error);
    res.status(500).json({ error: 'Bot ro\'yxatini olishda xatolik' });
  }
});

// Botga xabar yuborish
router.post('/broadcast', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { message, botNames, chatIds } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Xabar matn kiritilmagan' });
    }

    // Agar chatIds berilgan bo'lsa, ularga yuborish
    if (chatIds && Array.isArray(chatIds)) {
      const results = await sendToSpecificChats(message, chatIds, botNames);
      return res.json({ success: true, data: results });
    }

    // Aks holda admin chatlarga yuborish
    const results = await botManager.broadcastMessage(message, botNames);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Xabar yuborishda xatolik' });
  }
});

// Botni qayta ishga tushirish
router.post('/restart/:botName', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { botName } = req.params;
    const success = await botManager.restartBot(botName);
    
    if (success) {
      res.json({ success: true, message: `${botName} bot qayta ishga tushdi` });
    } else {
      res.status(500).json({ error: `${botName} botni qayta ishga tushirib bo'lmadi` });
    }
  } catch (error) {
    console.error('Bot restart error:', error);
    res.status(500).json({ error: 'Botni qayta ishga tushirishda xatolik' });
  }
});

// Mijoz bot orqali buyurtma berish - ✅ Autentifikatsiya qo'shildi
router.post('/customer/order', async (req, res) => {
  try {
    const { telegramChatId, items, customerInfo } = req.body;

    if (!telegramChatId) {
      return res.status(400).json({ error: 'Telegram chat ID majburiy' });
    }

    // Mijozni topish yoki yaratish
    let customer = await prisma.customer.findFirst({
      where: { telegramChatId: telegramChatId.toString() }
    });

    if (!customer && customerInfo) {
      customer = await prisma.customer.create({
        data: {
          name: customerInfo.name,
          phone: customerInfo.phone || '',
          telegramChatId: telegramChatId.toString(),
          telegramUsername: customerInfo.username || '',
          category: 'NEW'
        }
      });
    }

    if (!customer) {
      return res.status(404).json({ error: 'Mijoz topilmadi' });
    }

    // Buyurtma yaratish
    const orderNumber = `ORD-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerId: customer.id,
        status: 'PENDING',
        totalAmount: items.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0),
        requestedDate: new Date(),
        notes: JSON.stringify(items)
      }
    });

    // Mijozga tasdiqlash xabari yuborish
    const customerBot = botManager.getBot('customer') || botManager.getBot('customer-new');
    if (customerBot) {
      const message = `
✅ **BUYURTMA QABUL QILINDI**

📋 **Buyurtma #${order.id}**
💰 **Jami summa:** $${order.totalAmount}
📅 **Sana:** ${new Date().toLocaleDateString()}

📦 **Mahsulotlar:**
${items.map((item: any, index: number) => 
  `${index + 1}. ${item.name} - ${item.quantity} qop - $${item.price * item.quantity}`
).join('\n')}

⏳ Buyurtmangiz ko'rib chiqilmoqda...
      `;

      await customerBot.sendMessage(telegramChatId, message, { parse_mode: 'Markdown' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Customer order error:', error);
    res.status(500).json({ error: 'Buyurtma berishda xatolik' });
  }
});

// Mijoz balansini olish - ✅ Autentifikatsiya qo'shildi
router.get('/customer/balance/:telegramChatId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { telegramChatId } = req.params;

    const customer = await prisma.customer.findFirst({
      where: { telegramChatId: telegramChatId.toString() }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Mijoz topilmadi' });
    }

    const [totalSales, totalPayments] = await Promise.all([
      prisma.sale.aggregate({
        where: { customerId: customer.id },
        _sum: { totalAmount: true }
      }),
      prisma.sale.aggregate({
        where: { customerId: customer.id },
        _sum: { paidAmount: true }
      })
    ]);

    const balance = {
      totalPurchases: totalSales._sum.totalAmount || 0,
      totalPayments: totalPayments._sum.paidAmount || 0,
      debt: (totalSales._sum.totalAmount || 0) - (totalPayments._sum.paidAmount || 0)
    };

    res.json({ success: true, data: balance });
  } catch (error) {
    console.error('Customer balance error:', error);
    res.status(500).json({ error: 'Balansni olishda xatolik' });
  }
});

// Mijoz sotuvlari tarixi - ✅ Autentifikatsiya qo'shildi
router.get('/customer/history/:telegramChatId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { telegramChatId } = req.params;
    const { limit = 10, offset = 0 } = req.query;

    const customer = await prisma.customer.findFirst({
      where: { telegramChatId: telegramChatId.toString() }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Mijoz topilmadi' });
    }

    const sales = await prisma.sale.findMany({
      where: { customerId: customer.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    res.json({ success: true, data: sales });
  } catch (error) {
    console.error('Customer history error:', error);
    res.status(500).json({ error: 'Tarixni olishda xatolik' });
  }
});

// Webhook endpoint'lari - ✅ Webhook secret tekshiruvi qo'shildi
router.post('/webhook/customer-old', verifyTelegramWebhook, async (req, res) => {
  try {
    const bot = botManager.getBot('customer-old');
    if (bot && typeof bot.processUpdate === 'function') {
      await bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Customer old webhook error:', error);
    res.sendStatus(500);
  }
});

router.post('/webhook/customer', verifyTelegramWebhook, async (req, res) => {
  try {
    const bot = botManager.getBot('customer');
    if (bot && typeof bot.processUpdate === 'function') {
      await bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Customer webhook error:', error);
    res.sendStatus(500);
  }
});

router.post('/webhook/customer-premium', verifyTelegramWebhook, async (req, res) => {
  try {
    const bot = botManager.getBot('customer-premium');
    if (bot && typeof bot.processUpdate === 'function') {
      await bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Customer premium webhook error:', error);
    res.sendStatus(500);
  }
});

router.post('/webhook/production', verifyTelegramWebhook, async (req, res) => {
  try {
    const bot = botManager.getBot('production');
    if (bot && typeof bot.processUpdate === 'function') {
      await bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Production webhook error:', error);
    res.sendStatus(500);
  }
});

router.post('/webhook/logistics', verifyTelegramWebhook, async (req, res) => {
  try {
    const bot = botManager.getBot('logistics');
    if (bot && typeof bot.processUpdate === 'function') {
      await bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Logistics webhook error:', error);
    res.sendStatus(500);
  }
});

router.post('/webhook/admin', verifyTelegramWebhook, async (req, res) => {
  try {
    const bot = botManager.getBot('admin');
    if (bot && typeof bot.processUpdate === 'function') {
      await bot.processUpdate(req.body);
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Admin webhook error:', error);
    res.sendStatus(500);
  }
});

// Yordamchi funksiyalar
function getBotType(botName: string): string {
  switch (botName) {
    case 'customer-old':
      return 'Mijozlar (Eski)';
    case 'customer':
      return 'Mijozlar';
    case 'customer-premium':
      return 'Mijozlar (Premium)';
    case 'production':
      return 'Ishlab chiqarish';
    case 'logistics':
      return 'Logistika';
    case 'admin':
      return 'Admin';
    default:
      return 'Noma\'lum';
  }
}

async function sendToSpecificChats(message: string, chatIds: string[], botNames?: string[]) {
  const results = [];
  const targetBots = botNames || ['customer', 'customer-new'];

  for (const botName of targetBots) {
    const bot = botManager.getBot(botName);
    if (bot) {
      for (const chatId of chatIds) {
        try {
          await bot.sendMessage(chatId, message);
          results.push({ bot: botName, chatId, status: 'success' });
        } catch (error) {
          results.push({ bot: botName, chatId, status: 'error', error: error });
        }
      }
    }
  }

  return results;
}

export default router;
