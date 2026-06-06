import { randomUUID } from 'crypto';

import type { MiddlewareHandler } from 'hono';

import type { AppEnv } from '../types/app-env';

export const requestContextMiddleware: MiddlewareHandler<AppEnv> = async (context, next) => {
  const requestId = context.req.header('x-request-id') ?? randomUUID();

  context.set('requestId', requestId);
  context.set('currentUser', null);
  context.header('x-request-id', requestId);

  await next();
};
