import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

class MemoryStore {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000,
    });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let deleted = 0;
    for (const key of keys) {
      if (this.store.delete(key)) deleted++;
    }
    return deleted;
  }
}

const memoryFallback = new MemoryStore();
let isRedisConnected = false;

export function getIsRedisConnected(): boolean {
  return isRedisConnected;
}

const realRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times >= 1) return null;
    return 100;
  },
});

realRedis.on('connect', () => {
  isRedisConnected = true;
  logger.info('✅ Redis connected successfully');
});

realRedis.on('error', (_err) => {
  if (!isRedisConnected) {
    logger.warn('⚠️ Local Redis server not running — operating with in-memory store for auth tokens and rate-limiting');
  }
});

realRedis.connect().catch(() => {});

export const redisProxy: any = new Proxy(
  {},
  {
    get(_target, prop: string) {
      if (isRedisConnected) {
        const val = (realRedis as any)[prop];
        return typeof val === 'function' ? val.bind(realRedis) : val;
      }
      const val = (memoryFallback as any)[prop];
      return typeof val === 'function' ? val.bind(memoryFallback) : val;
    },
  }
);

export default redisProxy;
