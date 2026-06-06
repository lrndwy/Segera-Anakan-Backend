import { randomUUID } from 'crypto';

import { desc, eq, inArray } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

import { env } from '../../src/config/env';
import { UserRole, UserStatus } from '../../src/constants';
import type { Database } from '../../src/db/client';
import { auditLogs, userSessions, users } from '../../src/db/schema';
import { generateUuid } from '../../src/lib/crypto';
import { passwordService } from '../../src/lib/password.service';
import { INACTIVE_USER_EMAIL, INACTIVE_USER_ID, TEST_USER_IDS } from './test-users';

export const findSessionByRefreshToken = async (db: Database, refreshToken: string) => {
  const rows = await db.select().from(userSessions).where(eq(userSessions.refreshToken, refreshToken)).limit(1);
  return rows[0] ?? null;
};

export const countSessionsByRefreshToken = async (db: Database, refreshToken: string): Promise<number> => {
  const rows = await db.select().from(userSessions).where(eq(userSessions.refreshToken, refreshToken));
  return rows.length;
};

export const getLatestAuthAuditLog = async (db: Database, action: string) => {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.action, action))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);

  return rows[0] ?? null;
};

export const resetAuthTestData = async (db: Database): Promise<void> => {
  await db.delete(userSessions).where(inArray(userSessions.userId, [...TEST_USER_IDS, INACTIVE_USER_ID]));
  await db.delete(auditLogs).where(eq(auditLogs.module, 'AUTH'));
};

export const seedInactiveUser = async (db: Database): Promise<void> => {
  const existing = await db.select().from(users).where(eq(users.email, INACTIVE_USER_EMAIL)).limit(1);

  if (existing.length > 0) {
    return;
  }

  const passwordHash = await passwordService.hashPassword('TestPass123!');

  await db.insert(users).values({
    id: INACTIVE_USER_ID,
    email: INACTIVE_USER_EMAIL,
    passwordHash,
    fullName: 'Inactive User',
    phone: '081111111112',
    role: UserRole.ADMIN_DESA,
    status: UserStatus.INACTIVE,
    villageId: '11111111-1111-4111-8111-111111111101',
  });
};

export const createExpiredRefreshToken = (userId: string, tokenVersion = 1): string => {
  return jwt.sign(
    { sub: userId, tokenVersion, tokenType: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '-1h', issuer: env.APP_NAME },
  );
};

export const createValidRefreshTokenWithExpiredSession = async (
  db: Database,
  userId: string,
  tokenVersion = 1,
): Promise<string> => {
  const refreshToken = jwt.sign(
    { sub: userId, tokenVersion, tokenType: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '30d', issuer: env.APP_NAME },
  );

  await db.insert(userSessions).values({
    id: generateUuid(),
    userId,
    refreshToken,
    expiredAt: new Date(Date.now() - 60_000),
  });

  return refreshToken;
};

export const createSessionForRefreshToken = async (
  db: Database,
  userId: string,
  refreshToken: string,
  expiredAt: Date,
): Promise<void> => {
  await db.insert(userSessions).values({
    id: randomUUID(),
    userId,
    refreshToken,
    expiredAt,
  });
};
