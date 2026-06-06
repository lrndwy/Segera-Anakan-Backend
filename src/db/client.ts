import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../config/env';
import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;
export type DatabaseClient = Pick<Database, 'select' | 'insert' | 'update' | 'delete' | 'transaction' | 'execute'>;

export const createDatabase = () => {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  const db = drizzle(pool, { schema });

  return { pool, db };
};
