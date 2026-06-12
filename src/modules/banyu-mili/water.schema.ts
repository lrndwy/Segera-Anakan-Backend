import { WaterCondition, WaterStatus } from '../../constants';
import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

const waterStatusSchema = z.enum([WaterStatus.AMAN, WaterStatus.SIAGA, WaterStatus.KRITIS]);
const waterConditionSchema = z.enum([WaterCondition.TAWAR, WaterCondition.PAYAU]);

export const waterAssetIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const waterReportIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const waterAlertIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listWaterAssetsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
});

export const listWaterReportsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
});

export const listWaterAlertsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
});

export const createWaterAssetSchema = z.object({
  villageId: z.string().uuid(),
  name: z.string().trim().min(1),
  locationName: z.string().trim().min(1),
  latitude: z.number(),
  longitude: z.number(),
  capacityLiter: z.number().int().positive(),
});

export const updateWaterAssetSchema = z.object({
  name: z.string().trim().min(1).optional(),
  locationName: z.string().trim().min(1).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  capacityLiter: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const createWaterReportSchema = z.object({
  waterAssetId: z.string().uuid(),
  volumePercent: z.number().int().min(0).max(100),
  waterCondition: waterConditionSchema,
  notes: z.string().trim().optional(),
});

export const updateWaterReportSchema = z.object({
  volumePercent: z.number().int().min(0).max(100).optional(),
  waterCondition: waterConditionSchema.optional(),
  notes: z.string().trim().optional(),
});

export const resolveWaterAlertSchema = z.object({
  notes: z.string().trim().min(1),
});

export const villageWaterStatusResponseSchema = z.object({
  villageId: z.string().uuid(),
  villageName: z.string(),
  status: waterStatusSchema,
  lastUpdated: z.string(),
  percentRemaining: z.number().int().min(0).max(100).nullable(),
  capacityTotalLiters: z.number().int().min(0),
  currentVolumeLiters: z.number().int().min(0),
});

export const waterPublicAssetResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  locationName: z.string(),
  capacityLiter: z.number(),
  villageId: z.string().uuid(),
  villageName: z.string(),
});

export const waterAssetResponseSchema = z.object({
  id: z.string().uuid(),
  villageId: z.string().uuid(),
  name: z.string(),
  locationName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  capacityLiter: z.number(),
  isActive: z.boolean(),
});

export const waterReportResponseSchema = z.object({
  id: z.string().uuid(),
  waterAssetId: z.string().uuid(),
  submittedBy: z.string().uuid(),
  volumePercent: z.number(),
  waterCondition: waterConditionSchema,
  estimatedDaysLeft: z.number(),
  status: waterStatusSchema,
  notes: z.string().nullable(),
  reportedAt: z.string(),
});

export const waterAlertResponseSchema = z.object({
  id: z.string().uuid(),
  waterAssetId: z.string().uuid(),
  status: waterStatusSchema,
  message: z.string(),
  resolved: z.boolean(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
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

export type ListWaterAssetsQuery = z.infer<typeof listWaterAssetsQuerySchema>;
export type ListWaterReportsQuery = z.infer<typeof listWaterReportsQuerySchema>;
export type ListWaterAlertsQuery = z.infer<typeof listWaterAlertsQuerySchema>;
export type CreateWaterAssetInput = z.infer<typeof createWaterAssetSchema>;
export type UpdateWaterAssetInput = z.infer<typeof updateWaterAssetSchema>;
export type CreateWaterReportInput = z.infer<typeof createWaterReportSchema>;
export type UpdateWaterReportInput = z.infer<typeof updateWaterReportSchema>;
export type ResolveWaterAlertInput = z.infer<typeof resolveWaterAlertSchema>;
