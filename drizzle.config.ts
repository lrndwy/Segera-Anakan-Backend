import 'dotenv/config';

import type { Config } from 'drizzle-kit';

const databaseUrl = 'postgresql://postgres:postgres@localhost:5432/pltu_app';

export default {
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
