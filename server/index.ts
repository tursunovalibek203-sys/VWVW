import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import jwt from 'jsonwebtoken';
import { prisma } from './utils/prisma.js'; 
import { logger } from './utils/logger.js';
import { setupSwagger } from './swagger.js';
import { securityLogger, sanitizeInput, csrfProtection } from './middleware/security.js';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import variantRoutes from './routes/variants.js';
import productVariantsRoutes from './routes/product-variants.js';
import rawMaterialRoutes from './routes/raw-materials.js';
import cardRoutes from './routes/cards.js';
import productTypeRoutes from './routes/product-types.js';
import productCategoriesRoutes from './routes/product-categories.js';
import supplierRoutes from './routes/suppliers.js';
import productionRoutes from './routes/production.js';
import qualityCheckRoutes from './routes/quality-checks.js';
import saleRoutes from './routes/sales.js';
import customerRoutes from './routes/customers.js';
import expenseRoutes from './routes/expenses.js';
import dashboardRoutes from './routes/dashboard.js';
import forecastRoutes from './routes/forecast.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import auditLogRoutes from './routes/audit-logs.js';
import cashierRoutes from './routes/cashier.js';
import taskRoutes from './routes/tasks.js';
import settingsRoutes from './routes/settings.js';
import notificationRoutes from './routes/notifications.js';
import backupRoutes from './routes/backup.js';
import analyticsRoutes from './routes/analytics.js';
import cashboxRoutes from './routes/cashbox.js';
import ordersRoutes from './routes/orders.js';
import inventoryAIRoutes from './routes/inventory-ai.js';
import logisticsRoutes from './routes/logistics.js';
import superManagerRoutes from './routes/super-manager.js';
import publicOrdersRoutes from './routes/public-orders.js';
import driversRoutes from './routes/drivers.js';
import customerChatRoutes from './routes/customer-chat.js';
import customerChatsRoutes from './routes/customer-chats.js';
import botApiRoutes from './routes/bot-api.js';
import statisticsRoutes from './routes/statistics';
import exportRoutes from './routes/export';
import printRoutes from './routes/print';
import bagLabelRoutes from './routes/bag-labels';
import budgetRoutes from './routes/budgets';
import realtimeRoutes from './routes/realtime';
import employeeLoansRoutes from './routes/employee-loans';
import exchangeRatesRoutes from './routes/exchange-rates';
import ledgerRoutes from './routes/ledger';

const app = express();
const PORT = process.env.PORT || 5003;

logger.info('Server starting');
logger.info('JWT_SECRET configured', { exists: !!process.env.JWT_SECRET });

// 🔒 HELMET - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", ...(process.env.CORS_ORIGIN || "http://localhost:5173").split(',').map(o => o.trim())],
    },
  },
  crossOriginEmbedderPolicy: false, // Development uchun
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// 🔒 Rate Limiting - DDoS himoyasi
// Trust proxy for accurate IP behind reverse proxy (only internal networks)
app.set('trust proxy', ['loopback', '127.0.0.1', '10.0.0.0/8']);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // Development uchun yuqori limit
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests from counting (optional optimization)
  skipSuccessfulRequests: false,
});

// Stricter limit for auth endpoints (relaxed in development for E2E testing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 500 : 10,
  message: {
    error: 'Too many login attempts, please try again after 15 minutes.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/cashier-login', authLimiter);

// CORS configuration - stricter in production
const getAllowedOrigins = (): string[] => {
  // Hardcoded Vercel domains — always allowed regardless of env var
  const alwaysAllowed = [
    'https://luxpetplast.vercel.app',
    'https://luxpetplast-alpha.vercel.app',
  ];

  // CORS_ORIGIN env var is additive (not a replacement)
  const envOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const productionOrigins = [...new Set([...alwaysAllowed, ...envOrigins])];

  if (process.env.NODE_ENV === 'production') {
    return productionOrigins;
  }

  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    ...productionOrigins,
  ];
};

const allowedOrigins = getAllowedOrigins();

// CORS middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      logger.warn('CORS blocked', { origin, allowed: allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'X-Request-ID', 'x-request-time', 'X-Request-Time', 'Origin', 'Accept'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🔒 Security middleware - must be after body parsers but before routes
app.use(securityLogger);
app.use(sanitizeInput);

// CSRF protection skipped — JWT token in Authorization header already prevents CSRF attacks

// Swagger API Documentation
setupSwagger(app);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/variants', variantRoutes);
app.use('/api/product-variants', productVariantsRoutes);
app.use('/api/raw-materials', rawMaterialRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/product-types', productTypeRoutes);
app.use('/api/product-categories', productCategoriesRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/quality-checks', qualityCheckRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/forecast', forecastRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/cashier', cashierRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cashbox', cashboxRoutes);
app.use('/api/inventory-ai', inventoryAIRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/super-manager', superManagerRoutes);
app.use('/api/public', publicOrdersRoutes);

// Bot API routes
app.use('/api/drivers', driversRoutes);
app.use('/api/bots', botApiRoutes);
app.use('/api/customer-chat', customerChatRoutes);
app.use('/api/customer-chats', customerChatsRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/print', printRoutes);
app.use('/api/bag-labels', bagLabelRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/realtime', realtimeRoutes);
app.use('/api/employee-loans', employeeLoansRoutes);
app.use('/api/exchange-rates', exchangeRatesRoutes);
app.use('/api/ledger', ledgerRoutes);

// Enhanced health check with DB connectivity
app.get('/api/health', async (req, res) => {
  const checks: any = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  
  // Database connectivity check
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
    checks.errors = checks.errors || [];
    checks.errors.push('Database connection failed');
  }
  
  const allOk = checks.database === 'ok';
  
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    ...checks
  });
});

// Telegram Web Z — chat sahifasi uchun static serve (har doim, production ham dev ham)
// Fayl manzili: VWVW/telegram_v6 (1)/telegram-web-z/dist/
const telegramWebZPath = path.join(process.cwd(), '..', 'telegram_v6 (1)', 'telegram-web-z', 'dist');
app.use('/telegram-web', (req, res, next) => {
  // iframe ichida ishlashi uchun X-Frame-Options va CSP ni o'chiramiz
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
  next();
}, express.static(telegramWebZPath));

// SPA fallback: /telegram-web/* → index.html
app.get('/telegram-web/*', (req, res) => {
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;");
  res.sendFile(path.join(telegramWebZPath, 'index.html'));
});

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(process.cwd(), 'dist');

  logger.info('Serving static files', { path: distPath });

  app.use(express.static(distPath));

  // SPA catch-all route - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/telegram-web')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
}

// Auth test endpoint - DEVELOPMENT ONLY (never expose decoded token
// claims in production)
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/test-auth', (req, res) => {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ error: 'No auth header' });
    }

    const token = auth.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      res.json({ valid: true, user: decoded });
    } catch (e) {
      res.status(401).json({ valid: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  });
}

// Global error handler - must be last (BEFORE app.listen)
app.use(errorHandler);

// One-time migration: kapsula → preform (gramga qarab bagType)
async function migrateKapsulaToPreform() {
  try {
    const kapsulas = await prisma.product.findMany({
      where: { warehouse: 'kapsula' },
      select: { id: true, name: true }
    });
    if (kapsulas.length === 0) return;

    let count = 0;
    for (const p of kapsulas) {
      const m = p.name.match(/(\d+)\s*(?:гр|г|gr)/i);
      if (!m) continue;
      const gram = m[1] + 'гр';
      await prisma.product.update({ where: { id: p.id }, data: { warehouse: 'preform', bagType: gram } });
      count++;
    }
    if (count > 0) logger.info(`Migration: ${count} ta kapsula → preform qilindi`);
  } catch (e: any) {
    logger.warn('migrateKapsulaToPreform xatolik: ' + e.message);
  }
}

app.listen(PORT, async () => {
  logger.info('Server started successfully');
  logger.info(`API available at http://localhost:${PORT}/api`);
  logger.info(`Health check at http://localhost:${PORT}/api/health`);

  await migrateKapsulaToPreform();

  // Admin bot — kunlik 19:00 hisobot va backup tugmasi
  try {
    const { initAdminBot } = await import('./bot/admin-bot.js');
    initAdminBot();
  } catch (err: any) {
    logger.warn('Admin bot ishga tushirishda xatolik: ' + err.message);
  }

  // Render free tier uxlab qolmaslik uchun har 9 daqiqada o'zini ping qiladi
  if (process.env.NODE_ENV === 'production' && process.env.RENDER_EXTERNAL_URL) {
    const selfUrl = process.env.RENDER_EXTERNAL_URL + '/api/health';
    setInterval(() => {
      fetch(selfUrl).catch(() => {});
    }, 9 * 60 * 1000);
    logger.info('Keep-alive ping started: ' + selfUrl);
  }
});
