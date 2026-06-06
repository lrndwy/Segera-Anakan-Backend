import type { ErrorHandler } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import type { Logger } from 'pino';
import { ZodError } from 'zod';

import type { AppEnv } from '../types/app-env';
import { InternalServerException, ValidationException, isHttpException } from '../lib/exceptions';
import { errorResponse } from '../lib/response';
import { formatZodErrors } from '../lib/validation';

export const createErrorHandler = (logger: Logger): ErrorHandler<AppEnv> => {
  return (error, context) => {
    logger.error(
      {
        requestId: context.get('requestId'),
        path: context.req.path,
        method: context.req.method,
        err: error,
      },
      'request failed',
    );

    if (error instanceof ZodError) {
      const validationError = new ValidationException('Validation failed', formatZodErrors(error));
      context.status(validationError.statusCode as StatusCode);
      return context.json(errorResponse(validationError.message, validationError.errors));
    }

    if (isHttpException(error)) {
      context.status(error.statusCode as StatusCode);
      return context.json(errorResponse(error.message, error.errors));
    }

    const internalError = new InternalServerException();
    context.status(internalError.statusCode as StatusCode);
    return context.json(errorResponse(internalError.message));
  };
};

export const createNotFoundHandler = () => {
  return (context: Parameters<ErrorHandler<AppEnv>>[1]) => {
    return context.json(errorResponse('Route not found'), 404);
  };
};
