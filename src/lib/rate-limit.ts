import type Redis from 'ioredis';

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

export const evaluateRateLimit = async (
  redis: Redis,
  key: string,
  windowMs: number,
  maxRequests: number,
): Promise<RateLimitResult> => {
  const currentCount = await redis.incr(key);

  if (currentCount === 1) {
    await redis.pexpire(key, windowMs);
  }

  const ttl = await redis.pttl(key);

  return {
    allowed: currentCount <= maxRequests,
    remaining: Math.max(maxRequests - currentCount, 0),
    resetAt: new Date(Date.now() + Math.max(ttl, 0)),
  };
};
