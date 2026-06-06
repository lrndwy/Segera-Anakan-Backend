import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

export const villageIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listVillagesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
});

export const updateVillageSchema = z.object({
  description: z.string().trim().optional(),
  contactName: z.string().trim().min(1).optional(),
  contactPhone: z.string().trim().min(1).optional(),
  contactEmail: z.string().trim().email().optional(),
});

export const updateVillageQrisSchema = z.object({
  fileId: z.string().uuid(),
});

export const villageListItemResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  contactName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string().email(),
});

export const villageQrisResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
});

export const villageDetailResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  contactName: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string().email(),
  qris: villageQrisResponseSchema.nullable(),
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

export type ListVillagesQuery = z.infer<typeof listVillagesQuerySchema>;
export type UpdateVillageInput = z.infer<typeof updateVillageSchema>;
export type UpdateVillageQrisInput = z.infer<typeof updateVillageQrisSchema>;
