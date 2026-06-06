import type Redis from 'ioredis';
import type { MiddlewareHandler } from 'hono';

import { env } from '../config/env';
import { TooManyRequestsException, isHttpException } from '../lib/exceptions';
import { evaluateRateLimit } from '../lib/rate-limit';
import type { AppEnv } from '../types/app-env';

type RateLimitOptions = {
  windowMs?: number;
  maxRequests?: number;
};

export const createRateLimitMiddleware = (
  redis: Redis,
  options: RateLimitOptions = {},
): MiddlewareHandler<AppEnv> => {
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;
  const maxRequests = options.maxRequests ?? env.RATE_LIMIT_MAX;

  return async (context, next) => {
    const path = context.req.path;

    if (path.startsWith('/health') || path.startsWith('/ready') || path.startsWith('/openapi')) {
      await next();
      return;
    }

    if (path.startsWith('/api/v1/realtime')) {
      await next();
      return;
    }

    const ip = context.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? context.req.header('x-real-ip') ?? 'unknown';
    const key = `rate-limit:${ip}:${path}`;

    try {
      const result = await evaluateRateLimit(redis, key, windowMs, maxRequests);

      context.header('x-rate-limit-remaining', String(result.remaining));
      context.header('x-rate-limit-reset', String(result.resetAt.getTime()));

      if (!result.allowed) {
        throw new TooManyRequestsException();
      }
    } catch (error) {
      if (isHttpException(error)) {
        throw error;
      }
    }

    await next();
  };
};
