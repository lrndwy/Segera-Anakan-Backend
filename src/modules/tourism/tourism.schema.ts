import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

export const destinationIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const bookingIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const boatOwnerIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listDestinationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
});

export const listBookingsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  status: z.string().trim().optional(),
});

export const listBoatOwnersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
});

export const createDestinationSchema = z.object({
  villageId: z.string().uuid(),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  pricePerPerson: z.number().positive(),
  capacityPerDay: z.number().int().positive(),
  maxPeoplePerBooking: z.number().int().positive(),
  imageFileIds: z.array(z.string().uuid()).optional(),
});

export const updateDestinationSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  pricePerPerson: z.number().positive().optional(),
  capacityPerDay: z.number().int().positive().optional(),
  maxPeoplePerBooking: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  imageFileIds: z.array(z.string().uuid()).optional(),
});

export const createBoatOwnerSchema = z.object({
  villageId: z.string().uuid(),
  fullName: z.string().trim().min(1),
  phone: z.string().trim().min(1),
  boatName: z.string().trim().min(1),
  boatCapacity: z.number().int().positive(),
});

export const updateBoatOwnerSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  boatName: z.string().trim().min(1).optional(),
  boatCapacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

export const createBookingSchema = z.object({
  destinationId: z.string().uuid(),
  customerName: z.string().trim().min(1),
  customerEmail: z.string().trim().email(),
  customerPhone: z.string().trim().min(1),
  bookingDate: z.string().date(),
  totalPeople: z.number().int().positive(),
});

export const createBookingPaymentSchema = z.object({
  bookingId: z.string().uuid(),
  fileId: z.string().uuid(),
  senderName: z.string().trim().min(1),
});

export const destinationListItemResponseSchema = z.object({
  id: z.string().uuid(),
  villageId: z.string().uuid(),
  villageName: z.string(),
  name: z.string(),
  description: z.string(),
  pricePerPerson: z.number(),
  capacityPerDay: z.number(),
  maxPeoplePerBooking: z.number(),
  isActive: z.boolean(),
  thumbnailUrl: z.string().nullable(),
});

export const destinationDetailResponseSchema = destinationListItemResponseSchema.extend({
  images: z.array(
    z.object({
      id: z.string().uuid(),
      fileId: z.string().uuid(),
      url: z.string(),
    }),
  ),
});

export const boatOwnerResponseSchema = z.object({
  id: z.string().uuid(),
  villageId: z.string().uuid(),
  fullName: z.string(),
  phone: z.string(),
  boatName: z.string(),
  boatCapacity: z.number(),
  isActive: z.boolean(),
  lastAssignedAt: z.string().nullable(),
});

export const createBookingResponseSchema = z.object({
  bookingId: z.string().uuid(),
  invoiceNumber: z.string(),
  totalAmount: z.number(),
  qris: z
    .object({
      villageId: z.string().uuid(),
      url: z.string(),
    })
    .nullable(),
});

export const bookingListItemResponseSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string(),
  villageId: z.string().uuid(),
  destinationId: z.string().uuid(),
  destinationName: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerPhone: z.string(),
  bookingDate: z.string(),
  totalPeople: z.number(),
  totalAmount: z.number(),
  status: z.string(),
  createdAt: z.string(),
});

export const bookingPaymentResponseSchema = z.object({
  id: z.string().uuid(),
  bookingId: z.string().uuid(),
  senderName: z.string(),
  paymentStatus: z.string(),
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

export type ListDestinationsQuery = z.infer<typeof listDestinationsQuerySchema>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuerySchema>;
export type ListBoatOwnersQuery = z.infer<typeof listBoatOwnersQuerySchema>;
export type CreateDestinationInput = z.infer<typeof createDestinationSchema>;
export type UpdateDestinationInput = z.infer<typeof updateDestinationSchema>;
export type CreateBoatOwnerInput = z.infer<typeof createBoatOwnerSchema>;
export type UpdateBoatOwnerInput = z.infer<typeof updateBoatOwnerSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type CreateBookingPaymentInput = z.infer<typeof createBookingPaymentSchema>;
