import Redis from 'ioredis';

// Redis is optional for localhost development
const REDIS_URL = process.env.REDIS_URL;

// Mock Redis client for when Redis is not available
class MockRedis {
  async get(key: string): Promise<string | null> { return null; }
  async set(key: string, value: string): Promise<'OK'> { return 'OK'; }
  async del(key: string): Promise<number> { return 0; }
  async quit(): Promise<'OK'> { return 'OK'; }
  on(event: string, callback: (...args: any[]) => void): this { return this; }
}

export let redis: Redis | MockRedis;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  redis.on('connect', () => {
    console.log('✅ Redis connected');
  });

  redis.on('error', (err: Error) => {
    console.error('❌ Redis error:', err.message);
  });

  redis.on('reconnecting', () => {
    console.log('🔄 Redis reconnecting...');
  });
} else {
  console.log('⚠️ Redis not configured - using mock client (localhost mode)');
  redis = new MockRedis();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing Redis connection...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing Redis connection...');
  await redis.quit();
  process.exit(0);
});
