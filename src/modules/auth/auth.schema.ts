import { z } from '../../lib/openapi-schema';
import { UserRole, UserStatus } from '../../constants';

const userRoleSchema = z.enum([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA, UserRole.KADER_DESA]);
const userStatusSchema = z.enum([UserStatus.ACTIVE, UserStatus.INACTIVE]);

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Email must be a valid format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const loginUserResponseSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  role: userRoleSchema,
  villageId: z.string().uuid().nullable(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: loginUserResponseSchema,
});

export const refreshTokenResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

export const currentUserResponseSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  villageId: z.string().uuid().nullable(),
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

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
