import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

export const auditLogIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
  module: z.string().trim().optional(),
  action: z.string().trim().optional(),
  user_id: z.string().uuid().optional(),
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  sort_by: z.enum(['createdAt', 'action', 'module', 'entityType']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const exportAuditLogsQuerySchema = listAuditLogsQuerySchema.extend({
  format: z.enum(['csv']).optional(),
});

export const auditLogListItemSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  module: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  userName: z.string().nullable(),
  ipAddress: z.string(),
  createdAt: z.string(),
});

export const auditLogDetailSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  module: z.string(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  user: z
    .object({
      id: z.string().uuid(),
      fullName: z.string(),
    })
    .nullable(),
  oldData: z.record(z.string(), z.unknown()).nullable(),
  newData: z.record(z.string(), z.unknown()).nullable(),
  ipAddress: z.string(),
  createdAt: z.string(),
});

export const auditLogSummarySchema = z.object({
  totalLogs: z.number(),
  todayLogs: z.number(),
  topModules: z.array(z.object({ module: z.string(), count: z.number() })),
  topActions: z.array(z.object({ action: z.string(), count: z.number() })),
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

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type ExportAuditLogsQuery = z.infer<typeof exportAuditLogsQuerySchema>;
