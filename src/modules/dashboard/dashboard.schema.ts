import { z } from '../../lib/openapi-schema';

export const dashboardStatsResponseSchema = z.object({
  totalRevenue: z.number(),
  activeBookings: z.number(),
  totalFishermen: z.number(),
  totalCommodities: z.number(),
  revenueGrowth: z.number(),
  bookingGrowth: z.number(),
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
