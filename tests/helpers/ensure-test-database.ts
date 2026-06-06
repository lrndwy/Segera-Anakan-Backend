import pg from 'pg';

const parseDatabaseName = (databaseUrl: string): { adminUrl: string; databaseName: string } | null => {
  const match = databaseUrl.match(/^(postgresql:\/\/[^/]+\/)([^/?]+)(\?.*)?$/);
  if (!match) {
    return null;
  }

  const [, prefix, databaseName, query = ''] = match;
  return {
    adminUrl: `${prefix}postgres${query}`,
    databaseName,
  };
};

export const ensureTestDatabase = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return;
  }

  const parsed = parseDatabaseName(databaseUrl);
  if (!parsed) {
    return;
  }

  const pool = new pg.Pool({ connectionString: parsed.adminUrl });

  try {
    const existing = await pool.query('select 1 from pg_database where datname = $1', [parsed.databaseName]);

    if (existing.rowCount === 0) {
      await pool.query(`create database "${parsed.databaseName}"`);
    }
  } finally {
    await pool.end();
  }
};
