import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

export const settingKeyParamSchema = z.object({
  key: z.string().trim().min(1),
});

export const listSettingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
});

export const createSettingSchema = z.object({
  key: z.string().trim().min(1).max(100),
  value: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

export const updateSettingSchema = z.object({
  value: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
});

export const settingResponseSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().nullable(),
  updatedAt: z.string(),
});

export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total_items: z.number(),
  total_pages: z.number(),
});

export const successEnvelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });

export const paginatedEnvelopeSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

export const messageEnvelopeSchema = z.object({
  success: z.literal(true),
  message: z.string(),
});

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export type ListSettingsQuery = z.infer<typeof listSettingsQuerySchema>;
export type CreateSettingInput = z.infer<typeof createSettingSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
