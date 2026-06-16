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

// POST /api/telegram-user/send-test — send test message to self
router.post('/send-test', async (req: AuthRequest, res) => {
  try {
    const { chatId } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { name: true } });
    await TelegramUserService.sendMessage(
      req.user!.id,
      chatId || 'me',
      `✅ LuxPetPlast ERP ulandi!\n👩‍💼 Kassir: ${user?.name}\n🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`
    );
    res.json({ sent: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
