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

process.env.DATABASE_URL = testDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl;
