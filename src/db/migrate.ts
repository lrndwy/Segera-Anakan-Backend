import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { sql } from 'drizzle-orm';

import { logger } from '../config';
import { createDatabase } from './client';

const migrationsDirectory = join(process.cwd(), 'src/db/migrations');

const migrationTableName = 'app_schema_migrations';

const ensureMigrationsTable = async (db: Awaited<ReturnType<typeof createDatabase>>['db']) => {
  await db.execute(sql`
    create table if not exists ${sql.raw(migrationTableName)} (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);
};

const run = async () => {
  const { pool, db } = createDatabase();

  try {
    await ensureMigrationsTable(db);

    const appliedVersions = await db.execute(sql`select version from ${sql.raw(migrationTableName)} order by version asc`);
    const appliedSet = new Set<string>(appliedVersions.rows.map((row) => String(row.version)));

    const files = (await readdir(migrationsDirectory)).filter((fileName) => fileName.endsWith('.sql')).sort();

    for (const fileName of files) {
      const version = fileName.replace(/\.sql$/, '');

      if (appliedSet.has(version)) {
        continue;
      }

      const sqlContent = await readFile(join(migrationsDirectory, fileName), 'utf8');

      logger.info({ version, fileName }, 'applying migration');
      await db.execute(sql.raw(sqlContent));
      await db.execute(sql`insert into ${sql.raw(migrationTableName)} (version) values (${version})`);
    }

    logger.info('migrations complete');
  } finally {
    await pool.end();
  }
};

void run().catch((error: unknown) => {
  logger.error({ error }, 'migration failed');
  process.exit(1);
});
