import { UserRole, UserStatus } from '../../constants';
import { MAX_LIMIT } from '../../lib/pagination';
import { z } from '../../lib/openapi-schema';

const userRoleSchema = z.enum([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA, UserRole.KADER_DESA]);
const userStatusSchema = z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]);

export const userIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(MAX_LIMIT).optional(),
  search: z.string().trim().optional(),
  role: userRoleSchema.optional(),
  status: userStatusSchema.optional(),
});

export const createUserSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required'),
    email: z.string().trim().min(1, 'Email is required').email('Email must be a valid format'),
    phone: z.string().trim().min(1, 'Phone is required'),
    password: z.string().min(1, 'Password is required'),
    role: userRoleSchema,
    villageId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, context) => {
    if (data.role === UserRole.ADMIN_KECAMATAN && data.villageId) {
      context.addIssue({
        code: 'custom',
        message: 'ADMIN_KECAMATAN must not have villageId',
        path: ['villageId'],
      });
    }

    if ((data.role === UserRole.ADMIN_DESA || data.role === UserRole.KADER_DESA) && !data.villageId) {
      context.addIssue({
        code: 'custom',
        message: 'villageId is required for this role',
        path: ['villageId'],
      });
    }
  });

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  role: userRoleSchema.optional(),
  villageId: z.string().uuid().nullable().optional(),
  status: userStatusSchema.optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(1, 'New password is required'),
});

export const userDetailResponseSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  status: userStatusSchema,
});

export const userListItemResponseSchema = userDetailResponseSchema.extend({
  phone: z.string(),
  villageId: z.string().uuid().nullable(),
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

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
