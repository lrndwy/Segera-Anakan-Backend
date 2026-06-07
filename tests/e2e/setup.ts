import { config as loadEnv } from 'dotenv';

loadEnv();

const deriveTestDatabaseUrl = (databaseUrl: string): string => {
  const match = databaseUrl.match(/^(.*\/)([^/?]+)(\?.*)?$/);
  if (!match) {
    return databaseUrl;
  }

  const [, prefix, dbName, query = ''] = match;
  if (dbName.endsWith('_test')) {
    return databaseUrl;
  }

  return `${prefix}${dbName}_test${query}`;
};

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? (process.env.DATABASE_URL ? deriveTestDatabaseUrl(process.env.DATABASE_URL) : undefined);

if (!testDatabaseUrl) {
  throw new Error('E2E tests require TEST_DATABASE_URL or DATABASE_URL to derive a dedicated *_test database.');
}

const redisPort = process.env.REDIS_PORT ?? '6380';
const minioPort = process.env.MINIO_API_PORT ?? '9100';

process.env.NODE_ENV = 'test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL ?? `redis://localhost:${redisPort}`;
process.env.STORAGE_ENDPOINT = process.env.TEST_STORAGE_ENDPOINT ?? `http://localhost:${minioPort}`;
process.env.DATABASE_URL = testDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl;
