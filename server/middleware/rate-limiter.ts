import rateLimit from 'express-rate-limit';

/**
 * Login endpoint uchun rate limiter
 * 15 daqiqada 5 ta urinish
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 5, // 5 ta urinish
  message: {
    success: false,
    error: 'Too many login attempts, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true,
});

/**
 * Registration endpoint uchun rate limiter
 * 1 soatda 3 ta urinish
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 soat
  max: 3,
  message: {
    success: false,
    error: 'Too many registration attempts, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * API endpoint lar uchun umumiy rate limiter
 * 1 daqiqada 100 ta request
 */
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 daqiqa
  max: 100,
  message: {
    success: false,
    error: 'Too many requests, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Muhim operatsiyalar uchun (delete, update)
 * 5 daqiqada 20 ta request
 */
export const criticalOperationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 daqiqa
  max: 20,
  message: {
    success: false,
    error: 'Too many operations, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * File upload uchun
 * 10 daqiqada 10 ta file
 */
export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 daqiqa
  max: 10,
  message: {
    success: false,
    error: 'Too many file uploads, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});
