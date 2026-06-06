import type { Context } from 'hono';
import { z, type ZodError, type ZodType } from 'zod';

import { ValidationException } from './exceptions';
import type { ValidationErrorDetail } from './response';

export const formatZodErrors = (error: ZodError): ValidationErrorDetail[] =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
  }));

export const validate = <T extends ZodType>(schema: T, data: unknown): z.infer<T> => {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationException('Validation failed', formatZodErrors(result.error));
  }

  return result.data;
};

export const validateBody = async <T extends ZodType>(context: Context, schema: T): Promise<z.infer<T>> => {
  const body: unknown = await context.req.json();
  return validate(schema, body);
};

export const validateQuery = <T extends ZodType>(context: Context, schema: T): z.infer<T> => {
  const query = context.req.query();
  return validate(schema, query);
};

export const validateParams = <T extends ZodType>(context: Context, schema: T): z.infer<T> => {
  return validate(schema, context.req.param());
};
