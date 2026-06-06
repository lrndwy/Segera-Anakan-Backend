import { AgencyType } from '../../constants';
import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

const agencyTypeSchema = z.enum([
  AgencyType.PDAM,
  AgencyType.BPBD,
  AgencyType.DINAS_SOSIAL,
  AgencyType.OTHER,
]);

export const agencyIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listAgenciesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
  agency_type: agencyTypeSchema.optional(),
});

export const createAgencySchema = z
  .object({
    name: z.string().trim().min(1),
    agencyType: agencyTypeSchema,
    email: z.string().trim().email().optional(),
    phone: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Boolean(data.email?.trim() || data.phone?.trim()), {
    message: 'At least email or phone is required',
    path: ['email'],
  });

export const updateAgencySchema = z.object({
  name: z.string().trim().min(1).optional(),
  agencyType: agencyTypeSchema.optional(),
  email: z.string().trim().email().nullable().optional(),
  phone: z.string().trim().min(1).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const sendAgencyEmailSchema = z.object({
  subject: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export const sendAgencyWhatsAppSchema = z.object({
  message: z.string().trim().min(1),
});

export const agencyResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  agencyType: agencyTypeSchema,
  email: z.string().nullable(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const sendAgencyEmailResponseSchema = z.object({
  emailLogId: z.string().uuid(),
  agencyNotificationLogId: z.string().uuid(),
  status: z.string(),
});

export const sendAgencyWhatsAppResponseSchema = z.object({
  notificationLogId: z.string().uuid(),
  agencyNotificationLogId: z.string().uuid(),
  status: z.string(),
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

export type ListAgenciesQuery = z.infer<typeof listAgenciesQuerySchema>;
export type CreateAgencyInput = z.infer<typeof createAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>;
export type SendAgencyEmailInput = z.infer<typeof sendAgencyEmailSchema>;
export type SendAgencyWhatsAppInput = z.infer<typeof sendAgencyWhatsAppSchema>;
