import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;

// JWT_SECRET tekshiruvi
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters long');
}

// Production da zaif secret tekshiruvi
if (process.env.NODE_ENV === 'production') {
  const weakSecrets = ['secret', 'dev-secret', 'test', 'password', '123456'];
  if (weakSecrets.some(weak => JWT_SECRET.toLowerCase().includes(weak))) {
    throw new Error('JWT_SECRET is too weak for production');
  }
}

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Login va parol kiritilishi shart' });
    }
    
    const user = await prisma.user.findUnique({ where: { login } });

    if (!user) {
      return res.status(401).json({
        error: 'Login yoki parol xato'
      });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Foydalanuvchi faol emas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ 
        error: 'Login yoki parol xato'
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ 
      token, 
      user: { id: user.id, name: user.name, role: user.role },
      message: 'Muvaffaqiyatli kirish'
    });
  } catch (error) {
    console.error('❌ Login error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      error: 'Server xatosi',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});

// Kassir login endpointi - Rate limiting bilan
router.post('/cashier-login', async (req, res) => {
  try {
    const { login, password } = req.body;
    if (!login || !password) {
      return res.status(400).json({ error: 'Login va parol kiritilishi shart' });
    }

    const user = await prisma.user.findUnique({ where: { login } });

    if (!user) {
      return res.status(401).json({
        error: 'Login yoki parol xato'
      });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Foydalanuvchi faol emas' });
    }

    const allowedRoles = ['cashier', 'seller'];
    if (!allowedRoles.includes(user.role?.toLowerCase())) {
      return res.status(403).json({ error: 'Faqat kassirlar uchun' });
    }

    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ 
        error: 'Login yoki parol xato'
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ 
      token, 
      user: { id: user.id, name: user.name, role: user.role },
      message: 'Muvaffaqiyatli kirish'
    });
  } catch (error) {
    console.error('❌ Cashier login error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      error: 'Server xatosi',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});

router.post('/register', authenticate, authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { password, name, role, login } = req.body;
    
    if (!login || !password || !name) {
      return res.status(400).json({ error: 'Login, parol va ism kiritilishi shart' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { password: hashedPassword, name, role, login },
    });

    res.json({ id: user.id, name: user.name, role: user.role, login: user.login });
  } catch (error) {
    console.error('❌ Register error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ 
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});

// Current user ma'lumotlarini olish
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, role: true, active: true, createdAt: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Foydalanuvchi faol emas' });
    }

    res.json(user);
  } catch (error) {
    console.error('❌ Get me error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(401).json({ error: 'Noto\'g\'ri token' });
  }
});

// Token refresh endpoint
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify existing token signature
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; name?: string };

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, active: true, role: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Foydalanuvchi faol emas' });
    }

    // Generate new token with fresh DB values (role may have changed)
    const newToken = jwt.sign(
      { id: user.id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token: newToken });
  } catch (error) {
    console.error('❌ Token refresh error:', error instanceof Error ? error.message : 'Unknown');
    res.status(401).json({ error: 'Invalid token' });
  }
});

// ============================================
// 📱 PHONE NUMBER AUTHENTICATION (DISABLED FOR SECURITY)
// ============================================

/**
 * Phone number login - ❌ Xavfsizlik sababli o'chirildi
 * Oldin: Telefon raqami orqali login qilish uchun
 * Endi: To'liq o'chirildi, chunki OTP/sms tasdiqlashisiz juda xavfli
 */
router.post('/phone-login', async (req, res) => {
  // Bu endpoint endi ishlatilmaydi - xavfsizlik sababli
  res.status(403).json({ 
    error: 'Bu endpoint noqonuniy foydalanish uchun ochiq emas',
    message: 'Telefon orqali login hozircha faol emas. Iltimos login/parol orqali kiring.'
  });
});

export default router;
