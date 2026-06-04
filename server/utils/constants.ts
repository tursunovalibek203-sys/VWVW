// Application constants - magic strings and values

export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SELLER: 'SELLER',
  CASHIER: 'CASHIER',
  MANAGER: 'MANAGER'
} as const;

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const;

export const CUSTOMER_CATEGORIES = {
  NEW: 'NEW',
  REGULAR: 'REGULAR',
  PREMIUM: 'PREMIUM',
  VIP: 'VIP'
} as const;

export const RATE_LIMIT = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_ATTEMPTS: 5,
  BLOCK_DURATION: 15 * 60 * 1000
} as const;

export const JWT_EXPIRY = {
  ACCESS_TOKEN: '30d',
  REFRESH_TOKEN: '7d'
} as const;

export default {
  USER_ROLES,
  ORDER_STATUS,
  CUSTOMER_CATEGORIES,
  RATE_LIMIT,
  JWT_EXPIRY
};
