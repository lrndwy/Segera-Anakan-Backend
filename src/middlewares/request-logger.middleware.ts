import type { MiddlewareHandler } from 'hono';
import type { Logger } from 'pino';

import type { AppEnv } from '../types/app-env';

export const createRequestLoggerMiddleware = (logger: Logger): MiddlewareHandler<AppEnv> => {
  return async (context, next) => {
    const startedAt = Date.now();

    await next();

    logger.info(
      {
        requestId: context.get('requestId'),
        method: context.req.method,
        path: context.req.path,
        status: context.res.status,
        durationMs: Date.now() - startedAt,
        ip: context.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? context.req.header('x-real-ip') ?? 'unknown',
      },
      'request processed',
    );
  };
};
