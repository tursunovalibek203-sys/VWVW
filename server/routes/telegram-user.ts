import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { TelegramUserService } from '../services/TelegramUserService';
import { prisma } from '../utils/prisma';

const router = Router();
router.use(authenticate);

// GET /api/telegram-user/status — check link status for current user
router.get('/status', async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { telegramPhone: true, telegramLinkedAt: true, telegramSession: true },
    });
    res.json({
      linked: !!user?.telegramSession,
      phone: user?.telegramPhone || null,
      linkedAt: user?.telegramLinkedAt || null,
      apiConfigured: true,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/send-code
router.post('/send-code', async (req: AuthRequest, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon raqami kerak' });
    await TelegramUserService.sendCode(req.user!.id, phone);
    res.json({ sent: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/verify-code
router.post('/verify-code', async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Kod kerak' });
    const result = await TelegramUserService.verifyCode(req.user!.id, code);
    res.json(result); // { linked: true, phone } yoki { needPassword: true }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/verify-password — only needed if account has 2FA cloud password
router.post('/verify-password', async (req: AuthRequest, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Parol kerak' });
    const result = await TelegramUserService.verifyPassword(req.user!.id, password);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message?.includes('PASSWORD_HASH_INVALID') ? 'Parol noto\'g\'ri' : e.message });
  }
});

// DELETE /api/telegram-user/unlink
router.delete('/unlink', async (req: AuthRequest, res) => {
  try {
    const result = await TelegramUserService.unlink(req.user!.id);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/send-test
// Body: { chatId?, topicId?, text? }
// chatId can be numeric ID, @username, +phone, or omit to send to self ("me")
// topicId: optional forum group topic/thread ID (message_thread_id)
router.post('/send-test', async (req: AuthRequest, res) => {
  try {
    const { chatId, topicId, text } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
    const msg = text || `✅ LuxPetPlast ERP ulandi!\n👩‍💼 Kassir: ${user?.name}\n🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`;
    await TelegramUserService.sendMessage(
      req.user!.id,
      chatId || 'me',
      msg,
      topicId ? Number(topicId) : undefined,
    );
    res.json({ sent: true, peer: chatId || 'me' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/send-to-customer
// Body: { customerId, text? } — send a test/custom message to a customer via all their contacts
router.post('/send-to-customer', async (req: AuthRequest, res) => {
  try {
    const { customerId, text } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId kerak' });

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { name: true, telegramChatId: true, telegramUsername: true, telegramTopicId: true, phone: true },
    });
    if (!customer) return res.status(404).json({ error: 'Mijoz topilmadi' });

    const sender = await TelegramUserService.findActiveSender(req.user!.id);
    if (!sender) return res.status(400).json({ error: 'Birorta kassir/admin Telegram ulamagan' });

    const msg = text || `👋 Salom, ${customer.name}!\n\n📦 LuxPetPlast ERP dan xabar.\n🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`;
    const result = await TelegramUserService.sendToCustomer(sender.session, customer, msg);
    res.json({ sent: true, peer: result.peer, senderName: sender.name });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/telegram-user/forum-config — joriy forum group ID ni ko'rish
router.get('/forum-config', async (req: AuthRequest, res) => {
  try {
    const groupId = await TelegramUserService.getForumGroupId();
    res.json({ configured: !!groupId, groupId: groupId || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/forum-config — forum group ID ni saqlash
// Body: { groupId: "-1001234567890" }
router.post('/forum-config', async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: 'groupId kerak' });
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
    await TelegramUserService.setForumGroupId(String(groupId), user?.name || req.user!.id);
    res.json({ saved: true, groupId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/create-customer-topic
// Body: { customerId, groupId? }
router.post('/create-customer-topic', async (req: AuthRequest, res) => {
  try {
    const { customerId, groupId } = req.body;
    if (!customerId) return res.status(400).json({ error: 'customerId kerak' });
    const result = await TelegramUserService.createCustomerForumTopic(req.user!.id, customerId, groupId);
    if (!result) return res.status(400).json({ error: 'Topic yaratib bo\'lmadi. Telegram ulanganligini va group ID ni tekshiring.' });
    res.json({ created: true, topicId: result.topicId, groupId: result.groupId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/bulk-create-topics
// Creates forum topics for ALL customers that don't have one yet
router.post('/bulk-create-topics', async (req: AuthRequest, res) => {
  try {
    const sender = await TelegramUserService.findActiveSender(req.user!.id);
    if (!sender) return res.status(400).json({ error: 'Telegram ulanmagan. Avval shaxsiy akkauntingizni ulang.' });

    const groupId = await TelegramUserService.getForumGroupId();
    if (!groupId) return res.status(400).json({ error: 'Forum guruh ID sozlanmagan. Sozlamalar → Bildirishnomalar bo\'limiga kiring.' });

    const customers = await prisma.customer.findMany({
      where: { telegramTopicId: null },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    if (customers.length === 0) {
      return res.json({ total: 0, created: 0, skipped: 0, failed: 0, message: 'Barcha mijozlar uchun topic allaqachon yaratilgan' });
    }

    let created = 0, failed = 0, skipped = 0;
    const errors: string[] = [];

    for (const customer of customers) {
      try {
        const result = await TelegramUserService.createCustomerForumTopic(req.user!.id, customer.id, groupId);
        if (result) {
          created++;
        } else {
          skipped++;
        }
        // Small delay to avoid Telegram flood limits
        await new Promise((r) => setTimeout(r, 600));
      } catch (e: any) {
        failed++;
        errors.push(`${customer.name}: ${e.message}`);
        console.warn(`⚠️ ${customer.name} uchun topic yaratishda xatolik:`, e.message);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    res.json({
      total: customers.length,
      created,
      skipped,
      failed,
      errors: errors.slice(0, 5),
      message: `${created} ta topic yaratildi, ${failed} ta xatolik, ${skipped} ta o'tkazib yuborildi`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/telegram-user/kassa-status
router.get('/kassa-status', async (req: AuthRequest, res) => {
  try {
    const [groupId, topicId] = await Promise.all([
      TelegramUserService.getForumGroupId(),
      TelegramUserService.getKassaTopicId(),
    ]);
    res.json({ configured: !!topicId, topicId: topicId || null, groupId: groupId || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/telegram-user/setup-kassa-topic
router.post('/setup-kassa-topic', async (req: AuthRequest, res) => {
  try {
    const sender = await TelegramUserService.findActiveSender(req.user!.id);
    if (!sender) return res.status(400).json({ error: 'Telegram ulanmagan. Avval shaxsiy akkauntingizni ulang.' });

    const groupId = await TelegramUserService.getForumGroupId();
    if (!groupId) return res.status(400).json({ error: 'Forum guruh ID sozlanmagan.' });

    const result = await TelegramUserService.createKassaTopic(req.user!.id);
    if (!result) return res.status(400).json({ error: 'Kassa topic yaratib bo\'lmadi.' });

    res.json({ created: true, topicId: result.topicId, groupId: result.groupId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
