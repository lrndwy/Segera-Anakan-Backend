import { RobStatus } from '../../constants';
import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

const robStatusSchema = z.enum([RobStatus.AMAN, RobStatus.WASPADA, RobStatus.BAHAYA]);

export const listRobHistoriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});

export const manualOverrideSchema = z.object({
  status: robStatusSchema,
  reason: z.string().trim().min(1, 'Reason is required'),
});

export const robStatusResponseSchema = z.object({
  status: robStatusSchema,
  score: z.number(),
  waveHeight: z.number(),
  tideHeight: z.number(),
  rainfall: z.number(),
  recordedAt: z.string(),
});

export const robHistoryItemResponseSchema = z.object({
  id: z.string().uuid(),
  status: robStatusSchema,
  score: z.number(),
  waveHeight: z.number(),
  tideHeight: z.number(),
  rainfall: z.number(),
  notes: z.string().nullable(),
  recordedAt: z.string(),
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

export type ListRobHistoriesQuery = z.infer<typeof listRobHistoriesQuerySchema>;
export type ManualOverrideInput = z.infer<typeof manualOverrideSchema>;
