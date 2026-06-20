import { Request, Response, NextFunction } from 'express';

interface CacheEntry {
  data: string;
  contentType: string;
  createdAt: number;
  ttl: number;
}

const store = new Map<string, CacheEntry>();

// Background: expired entries tozalash (har 5 daqiqada)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.createdAt > entry.ttl) store.delete(key);
  }
}, 5 * 60 * 1000);

function cacheKey(req: Request): string {
  return `${req.method}:${req.originalUrl}:${req.headers.authorization?.slice(-8) || 'anon'}`;
}

// GET so'rovlari uchun cache middleware
// ttlMs: cache muddati millisoniyada
export function withCache(ttlMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const key = cacheKey(req);
    const cached = store.get(key);

    if (cached && Date.now() - cached.createdAt < cached.ttl) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('X-Cache-Age', String(Math.floor((Date.now() - cached.createdAt) / 1000)));
      return res.send(cached.data);
    }

    // Response ni ushlash uchun res.json ni wrap qilamiz
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        store.set(key, {
          data: JSON.stringify(body),
          contentType: 'application/json',
          createdAt: Date.now(),
          ttl: ttlMs,
        });
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

// Ma'lum bir cache yozuvini yoki prefix bilan boshlanadigan kalitlarni tozalash
export function invalidateCache(urlPrefix: string) {
  for (const key of store.keys()) {
    if (key.includes(urlPrefix)) store.delete(key);
  }
}

export const responseCache = { withCache, invalidateCache, store };
