import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis, { getIsRedisConnected } from '../config/redis';

function getStore() {
  if (getIsRedisConnected()) {
    return new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    });
  }
  // When Redis is not connected, omit store so express-rate-limit uses built-in MemoryStore
  return undefined;
}

/**
 * Auth-specific rate limiter: 5 attempts per 15 minutes per mobile+IP combo.
 * Section 9.1: "Rate-limit login attempts: 5 attempts / 15 min per mobile+IP combo"
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
  keyGenerator: (req) => {
    const mobile = req.body?.mobile || 'unknown';
    return `auth:${req.ip}:${mobile}`;
  },
  store: getStore(),
});

/**
 * General API rate limiter: 100 requests per minute per IP.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down.',
  },
  store: getStore(),
});

/**
 * Assistant query rate limiter: 60 per hour per shop.
 * Section 9.3: "Rate-limit query submissions per shop (e.g. 60/hour)"
 */
export const assistantRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many queries. Please try again later.',
  },
  keyGenerator: (req) => `assistant:${req.user?.shopId || req.ip}`,
  store: getStore(),
});
