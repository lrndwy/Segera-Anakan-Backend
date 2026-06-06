import { config as loadEnv } from 'dotenv';

loadEnv();

process.env.NODE_ENV = 'test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? 'redis://localhost:6380';
process.env.STORAGE_ENDPOINT = process.env.TEST_STORAGE_ENDPOINT ?? 'http://localhost:9000';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
