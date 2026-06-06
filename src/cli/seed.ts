import { eq } from 'drizzle-orm';

import { createDatabase } from '../db/client';
import { env, logger } from '../config';
import { UserRole, UserStatus } from '../constants';
import { generateUuid } from '../lib/crypto';
import { passwordService } from '../lib/password.service';
import { users } from '../db/schema';

const seed = async () => {
  const { pool, db } = createDatabase();

  try {
    const existing = await db.select().from(users).where(eq(users.email, env.SEED_ADMIN_EMAIL)).limit(1);

    if (existing.length > 0) {
      logger.info({ email: env.SEED_ADMIN_EMAIL }, 'admin user already exists');
      return;
    }

    const passwordHash = await passwordService.hashPassword(env.SEED_ADMIN_PASSWORD);

    await db.insert(users).values({
      id: generateUuid(),
      email: env.SEED_ADMIN_EMAIL,
      passwordHash,
      fullName: 'Administrator',
      phone: '0800000000',
      role: UserRole.ADMIN_KECAMATAN,
      status: UserStatus.ACTIVE,
    });

    logger.info({ email: env.SEED_ADMIN_EMAIL }, 'admin user seeded');
  } finally {
    await pool.end();
  }
};

void seed().catch((error: unknown) => {
  logger.error({ error }, 'seed failed');
  process.exit(1);
});
