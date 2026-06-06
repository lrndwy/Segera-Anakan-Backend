import type { Context } from 'hono';

export const getRequestIp = (context: Context) =>
  context.req.header('x-forwarded-for')?.split(',')[0]?.trim() ?? context.req.header('x-real-ip') ?? 'unknown';

export const getRequestUserAgent = (context: Context) => context.req.header('user-agent') ?? undefined;
