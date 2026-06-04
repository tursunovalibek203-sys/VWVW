import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { sendOTPCode, generateOTPCode, storeOTPCode, verifyOTPCode, formatPhoneNumber } from '../utils/telegram-bot';

const router = Router();

// 🔒 RATE LIMITING: Brute force hujumlarini oldini olish
interface RateLimitStore {
  attempts: number;
  firstAttempt: number;
  blocked: boolean;
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitStore>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION = 15 * 60 * 1000; // 15 daqiqa
const WINDOW_MS = 15 * 60 * 1000; // 15 daqiqa

const checkRateLimit = (key: string): { allowed: boolean; remaining: number; message?: string } => {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  // Agar blocklangan bo'lsa
  if (record?.blocked && record.blockedUntil && record.blockedUntil > now) {
    const minutesLeft = Math.ceil((record.blockedUntil - now) / 60000);
    return { 
      allowed: false, 
      remaining: 0, 
      message: `Juda ko'p urinish. ${minutesLeft} daqiqadan keyin qayta urinib ko'ring.` 
    };
  }
  
  // Block vaqti o'tib ketgan bo'lsa, tozalash
  if (record?.blocked && record.blockedUntil && record.blockedUntil <= now) {
    rateLimitStore.delete(key);
  }
  
  // Yangi yoki eski record
  if (!record || (record.firstAttempt + WINDOW_MS) < now) {
    rateLimitStore.set(key, { attempts: 1, firstAttempt: now, blocked: false });
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 };
  }
  
  // Attempt qo'shish
  record.attempts++;
  
  // Limit oshib ketganmi?
  if (record.attempts >= MAX_ATTEMPTS) {
    record.blocked = true;
    record.blockedUntil = now + BLOCK_DURATION;
    return { 
      allowed: false, 
      remaining: 0, 
      message: 'Juda ko\'p urinish. 15 daqiqadan keyin qayta urinib ko\'ring.' 
    };
  }
  
  return { allowed: true, remaining: MAX_ATTEMPTS - record.attempts };
};

// Rate limit o'chirish (muvaffaqiyatli login dan keyin)
const resetRateLimit = (key: string) => {
  rateLimitStore.delete(key);
};
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
    
    // 🔒 Rate limit tekshiruvi
    const rateLimitKey = `${req.ip || 'unknown'}:${String(login).toLowerCase()}`;
    const rateLimitCheck = checkRateLimit(rateLimitKey);
    
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: rateLimitCheck.message,
        retryAfter: BLOCK_DURATION / 1000
      });
    }
    
    const user = await prisma.user.findUnique({ where: { login } });

    if (!user) {
      return res.status(401).json({ 
        error: 'Login yoki parol xato',
        remainingAttempts: rateLimitCheck.remaining 
      });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Foydalanuvchi faol emas' });
    }

    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) {
      return res.status(401).json({ 
        error: 'Login yoki parol xato',
        remainingAttempts: rateLimitCheck.remaining 
      });
    }
    
    // ✅ Muvaffaqiyatli login - rate limitni tozalash
    resetRateLimit(rateLimitKey);

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
    
    // 🔒 Rate limit tekshiruvi
    const rateLimitKey = `cashier:${req.ip || 'unknown'}:${String(login).toLowerCase()}`;
    const rateLimitCheck = checkRateLimit(rateLimitKey);
    
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ 
        error: rateLimitCheck.message,
        retryAfter: BLOCK_DURATION / 1000
      });
    }
    
    const user = await prisma.user.findUnique({ where: { login } });

    if (!user) {
      return res.status(401).json({ 
        error: 'Login yoki parol xato',
        remainingAttempts: rateLimitCheck.remaining 
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
        error: 'Login yoki parol xato',
        remainingAttempts: rateLimitCheck.remaining 
      });
    }
    
    // ✅ Muvaffaqiyatli login - rate limitni tozalash
    resetRateLimit(rateLimitKey);

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
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token topilmadi' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
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
    console.error('❌ Get current user error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(401).json({ 
      error: 'Token noto\'g\'ri yoki muddati tugagan',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
    });
  }
});

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string; name?: string };

    // Verify user still exists and is active before issuing new token
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, active: true, role: true, name: true },
    });

    if (!user) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
    if (!user.active) return res.status(401).json({ error: 'Foydalanuvchi faol emas' });

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

export default router;
