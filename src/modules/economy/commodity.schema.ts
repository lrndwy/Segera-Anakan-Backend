import { z } from '../../lib/openapi-schema';

export const listCommoditiesQuerySchema = z.object({
  search: z.string().trim().optional(),
});

export const commodityCatalogItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  categoryName: z.string(),
});

export const successEnvelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export type ListCommoditiesQuery = z.infer<typeof listCommoditiesQuerySchema>;
