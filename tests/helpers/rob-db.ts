import { count, desc, eq, sql } from 'drizzle-orm';

import type { Database } from '../../src/db/client';
import {
  auditLogs,
  robCurrentStatus,
  robHistories,
  robManualOverrides,
  robWebhookLogs,
} from '../../src/db/schema';

export const SEED_ROB_STATUS_ID = '22222222-2222-4222-8222-222222222201';

export const resetRobTestData = async (db: Database): Promise<void> => {
  await db.delete(robManualOverrides);
  await db.delete(robWebhookLogs);
  await db.delete(auditLogs).where(eq(auditLogs.module, 'ROB_GUARDIAN'));
  await db.delete(robHistories);
  await db.delete(robCurrentStatus);

  await db.insert(robCurrentStatus).values({
    id: SEED_ROB_STATUS_ID,
    status: 'AMAN',
    score: 0,
    waveHeight: '0',
    tideHeight: '0',
    rainfall: '0',
    source: 'SYSTEM',
    recordedAt: new Date(),
  });
};

export const clearRobCurrentStatus = async (db: Database): Promise<void> => {
  await db.delete(robCurrentStatus);
};

export const restoreRobCurrentStatus = async (db: Database): Promise<void> => {
  await db.insert(robCurrentStatus).values({
    id: SEED_ROB_STATUS_ID,
    status: 'AMAN',
    score: 0,
    waveHeight: '0',
    tideHeight: '0',
    rainfall: '0',
    source: 'SYSTEM',
    recordedAt: new Date(),
  });
};

export const countManualOverrides = async (db: Database): Promise<number> => {
  const rows = await db.select({ count: count() }).from(robManualOverrides);
  return rows[0]?.count ?? 0;
};

export const countHistories = async (db: Database): Promise<number> => {
  const rows = await db.select({ count: count() }).from(robHistories);
  return rows[0]?.count ?? 0;
};

export const getLatestAuditLog = async (db: Database, action: string) => {
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.action, action))
    .orderBy(desc(auditLogs.createdAt))
    .limit(1);

  return rows[0] ?? null;
};

export const getLatestWebhookLog = async (db: Database) => {
  const rows = await db.select().from(robWebhookLogs).orderBy(desc(robWebhookLogs.createdAt)).limit(1);
  return rows[0] ?? null;
};

export const getCurrentRobStatus = async (db: Database) => {
  const rows = await db.select().from(robCurrentStatus).orderBy(desc(robCurrentStatus.updatedAt)).limit(1);
  return rows[0] ?? null;
};

export const countAuditLogsByAction = async (db: Database, action: string): Promise<number> => {
  const rows = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(sql`${auditLogs.action} = ${action} and ${auditLogs.module} = 'ROB_GUARDIAN'`);

  return rows[0]?.count ?? 0;
};
