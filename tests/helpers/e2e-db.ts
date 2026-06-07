import { count, desc, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../../src/db/client';
import {
  agencyNotificationLogs,
  auditLogs,
  boatAssignments,
  boatOwners,
  bookingPayments,
  bookings,
  emailLogs,
  manifestItems,
  notificationLogs,
  robCurrentStatus,
  robHistories,
  robManualOverrides,
  robWebhookLogs,
  villages,
  waterAlerts,
} from '../../src/db/schema';

export const deactivateBoatOwnersInVillage = async (db: Database, villageId: string): Promise<void> => {
  await db.update(boatOwners).set({ isActive: false }).where(eq(boatOwners.villageId, villageId));
};

export const resetVillageTourismData = async (db: Database, villageId: string): Promise<void> => {
  const villageBookings = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.villageId, villageId));

  const bookingIds = villageBookings.map((row) => row.id);
  if (bookingIds.length > 0) {
    await db.delete(boatAssignments).where(inArray(boatAssignments.bookingId, bookingIds));
    await db.delete(bookingPayments).where(inArray(bookingPayments.bookingId, bookingIds));
    await db.delete(bookings).where(inArray(bookings.id, bookingIds));
  }
};

export const resetBookingsByDates = async (db: Database, dates: string[]): Promise<void> => {
  const datedBookings = await db.select({ id: bookings.id }).from(bookings).where(inArray(bookings.bookingDate, dates));

  const bookingIds = datedBookings.map((row) => row.id);
  if (bookingIds.length === 0) {
    return;
  }

  await db.delete(boatAssignments).where(inArray(boatAssignments.bookingId, bookingIds));
  await db.delete(bookingPayments).where(inArray(bookingPayments.bookingId, bookingIds));
  await db.delete(bookings).where(inArray(bookings.id, bookingIds));
};

export const countAuditLogs = async (db: Database, module: string, action: string, entityId?: string): Promise<number> => {
  const rows = await db
    .select({ count: count() })
    .from(auditLogs)
    .where(
      entityId
        ? sql`${auditLogs.module} = ${module} and ${auditLogs.action} = ${action} and ${auditLogs.entityId} = ${entityId}`
        : sql`${auditLogs.module} = ${module} and ${auditLogs.action} = ${action}`,
    );

  return rows[0]?.count ?? 0;
};

export const countAuthAuditLogs = async (db: Database, action: string): Promise<number> => {
  return countAuditLogs(db, 'AUTH', action);
};

export const getVillageById = async (db: Database, villageId: string) => {
  const rows = await db.select().from(villages).where(eq(villages.id, villageId)).limit(1);
  return rows[0] ?? null;
};

export const getCurrentRobStatus = async (db: Database) => {
  const rows = await db.select().from(robCurrentStatus).orderBy(desc(robCurrentStatus.updatedAt)).limit(1);
  return rows[0] ?? null;
};

export const countRobHistories = async (db: Database): Promise<number> => {
  const rows = await db.select({ count: count() }).from(robHistories);
  return rows[0]?.count ?? 0;
};

export const countManualOverrides = async (db: Database): Promise<number> => {
  const rows = await db.select({ count: count() }).from(robManualOverrides);
  return rows[0]?.count ?? 0;
};

export const countWebhookLogs = async (db: Database): Promise<number> => {
  const rows = await db.select({ count: count() }).from(robWebhookLogs);
  return rows[0]?.count ?? 0;
};

export const countWaterAlerts = async (db: Database, waterAssetId?: string): Promise<number> => {
  const rows = waterAssetId
    ? await db.select({ count: count() }).from(waterAlerts).where(eq(waterAlerts.waterAssetId, waterAssetId))
    : await db.select({ count: count() }).from(waterAlerts);

  return rows[0]?.count ?? 0;
};

export const countAgencyNotificationLogs = async (db: Database): Promise<number> => {
  const rows = await db.select({ count: count() }).from(agencyNotificationLogs);
  return rows[0]?.count ?? 0;
};

export const countEmailLogs = async (db: Database): Promise<number> => {
  const rows = await db.select({ count: count() }).from(emailLogs);
  return rows[0]?.count ?? 0;
};

export const countNotificationLogs = async (db: Database): Promise<number> => {
  const rows = await db.select({ count: count() }).from(notificationLogs);
  return rows[0]?.count ?? 0;
};

export const getLatestAuditLogByAction = async (db: Database, action: string) => {
  const rows = await db.select().from(auditLogs).where(eq(auditLogs.action, action)).orderBy(desc(auditLogs.createdAt)).limit(1);
  return rows[0] ?? null;
};

export const getManifestItemsByOrderId = async (db: Database, orderId: string) => {
  return db.select().from(manifestItems).where(eq(manifestItems.commodityOrderId, orderId));
};

export const containsSensitiveAuditData = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(containsSensitiveAuditData);
  }

  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const normalized = key.toLowerCase();
      if (['password', 'passwordhash', 'refreshtoken', 'accesstoken', 'token'].includes(normalized)) {
        return true;
      }

      if (containsSensitiveAuditData(nested)) {
        return true;
      }
    }
  }

  return false;
};
