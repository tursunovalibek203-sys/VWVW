import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redis } from '../utils/redis';

// FIXED: JWT secret har doim bir xil bo'lishi kerak
const JWT_SECRET = process.env.JWT_SECRET;

// JWT_SECRET tekshiruvi - graceful shutdown
function validateJwtSecret(): string {
  if (!JWT_SECRET) {
    console.error('❌ JWT_SECRET environment variable is required');
    console.error('Please set JWT_SECRET in your .env file');
    process.exit(1);
  }

  if (JWT_SECRET.length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters long');
    console.error(`Current length: ${JWT_SECRET.length}`);
    process.exit(1);
  }

  // Production da zaif secret tekshiruvi
  if (process.env.NODE_ENV === 'production') {
    const weakSecrets = ['secret', 'dev-secret', 'test', 'password', '123456'];
    if (weakSecrets.some(weak => JWT_SECRET.toLowerCase().includes(weak))) {
      console.error('❌ JWT_SECRET is too weak for production');
      process.exit(1);
    }
  }

  return JWT_SECRET;
}

const VALIDATED_JWT_SECRET = validateJwtSecret();

export interface AuthRequest extends Request {
  user?: { id: string; role: string; name?: string; email?: string };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Check if token is blacklisted (revoked) - only if Redis is configured
  if (process.env.REDIS_URL) {
    try {
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({ error: 'Token has been revoked' });
      }
    } catch (redisError) {
      // If Redis is down, log the error but continue with JWT verification
      console.error('Redis blacklist check failed:', redisError);
    }
  }

  try {
    const decoded = jwt.verify(token, VALIDATED_JWT_SECRET) as { id: string; role: string; name?: string; email?: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', details: error instanceof Error ? error.message : 'Unknown' });
  }
};

// Alias for backward compatibility
export const authenticateToken = authenticate;

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.some(role => role.toUpperCase() === req.user?.role?.toUpperCase())) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        requiredRoles: roles,
        yourRole: req.user?.role || 'unknown'
      });
    }
    next();
  };
};

// Restrict analytics access for cashiers
export const authorizeAnalytics = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role?.toLowerCase() === 'cashier') {
    return res.status(403).json({ error: 'Cashiers cannot access analytics' });
  }
  next();
};
