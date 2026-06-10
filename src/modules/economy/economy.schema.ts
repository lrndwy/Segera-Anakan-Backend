import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

export const fishermanIdParamSchema = z.object({ id: z.string().uuid() });
export const inventoryIdParamSchema = z.object({ id: z.string().uuid() });
export const orderIdParamSchema = z.object({ id: z.string().uuid() });
export const manifestIdParamSchema = z.object({ id: z.string().uuid() });

export const listCommodityInventoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
  commodity_id: z.string().uuid().optional(),
});

export const listCommodityOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  status: z.string().trim().optional(),
});

export const listFishermenQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
});

export const listManifestsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
});

export const createFishermanSchema = z.object({
  villageId: z.string().uuid(),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().optional(),
});

export const updateFishermanSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

export const createCommodityInventorySchema = z.object({
  fishermanId: z.string().uuid(),
  commodityId: z.string().uuid(),
  availableWeightKg: z.number().positive(),
  pricePerKg: z.number().positive(),
  fileId: z.string().uuid().optional(),
});

export const updateCommodityInventorySchema = z.object({
  availableWeightKg: z.number().positive().optional(),
  pricePerKg: z.number().positive().optional(),
  fileId: z.string().uuid().nullable().optional(),
});

export const adjustCommodityStockSchema = z.object({
  availableWeightKg: z.number().min(0),
  notes: z.string().trim().optional(),
});

export const createCommodityOrderSchema = z.object({
  buyerName: z.string().trim().min(1),
  buyerPhone: z.string().trim().min(1),
  buyerEmail: z.string().trim().email(),
  items: z
    .array(
      z.object({
        inventoryId: z.string().uuid(),
        quantityKg: z.number().positive(),
      }),
    )
    .min(1),
});

export const createCommodityPaymentSchema = z.object({
  commodityOrderId: z.string().uuid(),
  fileId: z.string().uuid(),
  senderName: z.string().trim().min(1),
});

export const rejectCommodityPaymentSchema = z.object({
  notes: z.string().trim().min(1),
});

export const createManifestSchema = z.object({
  villageId: z.string().uuid().optional(),
  manifestDate: z.string().date(),
});

export const addManifestItemSchema = z.object({
  commodityOrderId: z.string().uuid(),
});

export const fishermanResponseSchema = z.object({
  id: z.string().uuid(),
  villageId: z.string().uuid(),
  fullName: z.string(),
  phone: z.string().nullable(),
  isActive: z.boolean(),
});

export const commodityInventoryListItemSchema = z.object({
  id: z.string().uuid(),
  fishermanId: z.string().uuid(),
  fishermanName: z.string(),
  commodityId: z.string().uuid(),
  commodityName: z.string(),
  villageId: z.string().uuid(),
  villageName: z.string(),
  availableWeightKg: z.number(),
  pricePerKg: z.number(),
  fileId: z.string().uuid().nullable(),
  imageUrl: z.string().nullable(),
});

export const stockMovementResponseSchema = z.object({
  id: z.string().uuid(),
  inventoryId: z.string().uuid(),
  movementType: z.string(),
  quantityKg: z.number(),
  previousStockKg: z.number(),
  newStockKg: z.number(),
  referenceType: z.string(),
  referenceId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});

export const createCommodityOrderResponseSchema = z.object({
  orderId: z.string().uuid(),
  invoiceNumber: z.string(),
  totalAmount: z.number(),
  qris: z.object({ villageId: z.string().uuid(), url: z.string() }).nullable(),
});

export const commodityPaymentResponseSchema = z.object({
  id: z.string().uuid(),
  commodityOrderId: z.string().uuid(),
  senderName: z.string(),
  paymentStatus: z.string(),
  createdAt: z.string(),
});

export const commodityOrderListItemSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  villageId: z.string().uuid(),
  buyerName: z.string(),
  buyerPhone: z.string(),
  buyerEmail: z.string(),
  totalAmount: z.number(),
  status: z.string(),
  createdAt: z.string(),
});

export const manifestListItemSchema = z.object({
  id: z.string().uuid(),
  villageId: z.string().uuid(),
  manifestDate: z.string(),
  status: z.string(),
  itemCount: z.number(),
  createdAt: z.string(),
});

export const manifestDetailSchema = manifestListItemSchema.extend({
  departureTime: z.string().nullable(),
  completedAt: z.string().nullable(),
  items: z.array(
    z.object({
      id: z.string().uuid(),
      commodityOrderId: z.string().uuid(),
      invoiceNumber: z.string(),
      buyerName: z.string(),
    }),
  ),
});

export const paginationMetaSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total_items: z.number(),
  total_pages: z.number(),
});

export const successEnvelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({ success: z.literal(true), message: z.string(), data: dataSchema });

export const paginatedEnvelopeSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: z.array(itemSchema),
    meta: paginationMetaSchema,
  });

export const messageEnvelopeSchema = z.object({ success: z.literal(true), message: z.string() });
export const errorEnvelopeSchema = z.object({ success: z.literal(false), message: z.string() });

export type ListCommodityInventoryQuery = z.infer<typeof listCommodityInventoryQuerySchema>;
export type ListCommodityOrdersQuery = z.infer<typeof listCommodityOrdersQuerySchema>;
export type ListFishermenQuery = z.infer<typeof listFishermenQuerySchema>;
export type ListManifestsQuery = z.infer<typeof listManifestsQuerySchema>;
export type CreateFishermanInput = z.infer<typeof createFishermanSchema>;
export type UpdateFishermanInput = z.infer<typeof updateFishermanSchema>;
export type CreateCommodityInventoryInput = z.infer<typeof createCommodityInventorySchema>;
export type UpdateCommodityInventoryInput = z.infer<typeof updateCommodityInventorySchema>;
export type AdjustCommodityStockInput = z.infer<typeof adjustCommodityStockSchema>;
export type CreateCommodityOrderInput = z.infer<typeof createCommodityOrderSchema>;
export type CreateCommodityPaymentInput = z.infer<typeof createCommodityPaymentSchema>;
export type RejectCommodityPaymentInput = z.infer<typeof rejectCommodityPaymentSchema>;
export type CreateManifestInput = z.infer<typeof createManifestSchema>;
export type AddManifestItemInput = z.infer<typeof addManifestItemSchema>;
