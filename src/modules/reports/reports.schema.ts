import { z } from '../../lib/openapi-schema';

export const reportsQuerySchema = z.object({
  start_date: z.string().date(),
  end_date: z.string().date(),
});

export const reportChartItemSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  visitors: z.number(),
});

export const reportSummarySchema = z.object({
  averageDailyRevenue: z.number(),
  totalPeriodRevenue: z.number(),
});

export const reportsResponseSchema = z.object({
  chartData: z.array(reportChartItemSchema),
  summary: reportSummarySchema,
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

export type ReportsQuery = z.infer<typeof reportsQuerySchema>;
