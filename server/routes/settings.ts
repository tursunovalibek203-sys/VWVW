import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Get all settings
router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findMany();
    
    // Convert to key-value object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    // Default values if not set
    const defaultSettings = {
      USD_TO_UZS_RATE: '12500',
      EUR_TO_UZS_RATE: '13500',
      COMPANY_NAME: 'AzizTrades ERP',
      COMPANY_ADDRESS: 'Toshkent, O\'zbekiston',
      COMPANY_PHONE: '+998901234567',
      COMPANY_EMAIL: 'info@aziztrades.com',
      TAX_RATE: '12',
      INVOICE_PREFIX: 'INV',
      LOW_STOCK_THRESHOLD: '10',
      DEBT_ALERT_DAYS: '30',
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_ADMIN_CHAT_ID: '',
      SMS_API_KEY: '',
      EMAIL_SMTP_HOST: '',
      EMAIL_SMTP_PORT: '587',
      EMAIL_USERNAME: '',
      EMAIL_PASSWORD: '',
      BACKUP_FREQUENCY: 'daily',
      LANGUAGE: 'uz',
      TIMEZONE: 'Asia/Tashkent',
      ...settingsObj
    };

    res.json(defaultSettings);
  } catch (error) {
    res.status(500).json({ error: 'Sozlamalarni yuklashda xatolik' });
  }
});

// Update setting - faqat ADMIN (global sozlama/valyuta kursi barcha pul hisobiga ta'sir qiladi)
router.put('/:key', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const userId = (req as any).user.id;

    await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value,
        description,
        updatedBy: userId,
        updatedAt: new Date(),
      },
      create: {
        key,
        value,
        description,
        updatedBy: userId,
      },
    });

    res.json({ message: 'Sozlama yangilandi' });
  } catch (error) {
    res.status(500).json({ error: 'Sozlamani yangilashda xatolik' });
  }
});

// Update multiple settings - faqat ADMIN
router.put('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const settings = req.body;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Foydalanuvchi ID topilmadi. Iltimos, qayta kiring.' });
    }

    for (const [key, value] of Object.entries(settings)) {
      // Har qanday qiymatni string ga aylantirish
      const stringValue = value === null || value === undefined ? '' : String(value);
      
      await prisma.systemSettings.upsert({
        where: { key },
        update: {
          value: stringValue,
          updatedBy: userId,
          updatedAt: new Date(),
        },
        create: {
          key,
          value: stringValue,
          updatedBy: userId,
        },
      });
    }

    res.json({ message: 'Barcha sozlamalar yangilandi' });
  } catch (error: any) {
    console.error('Settings update error:', error);
    res.status(500).json({ 
      error: 'Sozlamalarni yangilashda xatolik',
      details: error.message 
    });
  }
});

// Get exchange rates
router.get('/exchange-rates', authenticate, async (req, res) => {
  try {
    const usdRate = await prisma.systemSettings.findUnique({
      where: { key: 'USD_TO_UZS_RATE' }
    });
    
    const eurRate = await prisma.systemSettings.findUnique({
      where: { key: 'EUR_TO_UZS_RATE' }
    });

    res.json({
      USD_TO_UZS: usdRate?.value || '12500',
      EUR_TO_UZS: eurRate?.value || '13500'
    });
  } catch (error) {
    res.status(500).json({ error: 'Valyuta kurslarini yuklashda xatolik' });
  }
});

export default router;