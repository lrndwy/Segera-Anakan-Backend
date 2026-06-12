import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('pltu-app-hono'),
  API_PREFIX: z.string().default('/api/v1'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('30d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).default(12),
  CORS_ORIGINS: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  STORAGE_ENDPOINT: z.string().default('http://localhost:9000'),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_BUCKET: z.string().default('pltu-files'),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
  STORAGE_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  STORAGE_PUBLIC_BASE_URL: z.string().optional(),
  PUBLIC_API_BASE_URL: z.string().url().optional(),
  EMAIL_QUEUE_NAME: z.string().default('email'),
  EMAIL_FROM: z.string().email().default('no-reply@example.com'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('ChangeMe123!'),
  BMKG_API_URL: z.string().url().default('https://api.bmkg.go.id/publik/prakiraan-cuaca'),
});

const parsed = envSchema.parse(process.env);

export const env = {
  ...parsed,
  isDevelopment: parsed.NODE_ENV === 'development',
  isProduction: parsed.NODE_ENV === 'production',
  corsOrigins: parsed.CORS_ORIGINS === '*' ? '*' : parsed.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
} as const;
