import { OpenAPIHono } from '@hono/zod-openapi';
import type { Context } from 'hono';

import type { AppEnv } from '../types/app-env';
import { errorResponse } from './response';
import { formatZodErrors } from './validation';

type ValidationHookResult = {
  success: boolean;
  error?: import('zod').ZodError;
};

export const openApiDefaultHook = (result: ValidationHookResult, context: Context<AppEnv>) => {
  if (!result.success) {
    return context.json(errorResponse('Validation failed', formatZodErrors(result.error!)), 422);
  }
};

export const createOpenAPIRouter = () => new OpenAPIHono<AppEnv>({ defaultHook: openApiDefaultHook });
