import { desc, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../../src/db/client';
import {
  auditLogs,
  boatAssignments,
  boatOwners,
  bookingPayments,
  bookings,
  destinations,
  files,
} from '../../src/db/schema';
import { generateUuid } from '../../src/lib/crypto';
import { VILLAGE_UJUNGGAGAK, VILLAGE_UJUNGALANG } from './test-users';

const TEST_VILLAGES = [VILLAGE_UJUNGGAGAK, VILLAGE_UJUNGALANG] as const;

export const TOURISM_TEST_FILE_BUCKET = 'test-tourism';

export const resetTourismTestData = async (db: Database): Promise<void> => {
  const villageBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(inArray(bookings.villageId, [...TEST_VILLAGES]));

  const bookingIds = villageBookings.map((row) => row.id);

  if (bookingIds.length > 0) {
    await db.delete(boatAssignments).where(inArray(boatAssignments.bookingId, bookingIds));
    await db.delete(bookingPayments).where(inArray(bookingPayments.bookingId, bookingIds));
    await db.delete(bookings).where(inArray(bookings.id, bookingIds));
  }

  await db.delete(destinations).where(inArray(destinations.villageId, [...TEST_VILLAGES]));
  await db.delete(boatOwners).where(inArray(boatOwners.villageId, [...TEST_VILLAGES]));
  await db.delete(auditLogs).where(eq(auditLogs.module, 'TOURISM'));
  await db.delete(files).where(eq(files.bucket, TOURISM_TEST_FILE_BUCKET));
};

export const createTestPaymentFile = async (db: Database): Promise<string> => {
  const id = generateUuid();

  await db.insert(files).values({
    id,
    bucket: TOURISM_TEST_FILE_BUCKET,
    objectName: `payments/${id}.jpg`,
    originalName: 'payment-proof.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    url: `http://localhost:9000/${TOURISM_TEST_FILE_BUCKET}/payments/${id}.jpg`,
  });

  return id;
};

export const getBookingById = async (db: Database, bookingId: string) => {
  const rows = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
  return rows[0] ?? null;
};

export const getLatestBookingPayment = async (db: Database, bookingId: string) => {
  const rows = await db
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.bookingId, bookingId))
    .orderBy(desc(bookingPayments.createdAt))
    .limit(1);

  return rows[0] ?? null;
};

export const getBoatAssignments = async (db: Database, bookingId: string) => {
  return db.select().from(boatAssignments).where(eq(boatAssignments.bookingId, bookingId));
};

export const getBoatOwnerByName = async (db: Database, boatName: string) => {
  const rows = await db.select().from(boatOwners).where(eq(boatOwners.boatName, boatName)).limit(1);
  return rows[0] ?? null;
};

export const countTourismAuditLogs = async (db: Database, action: string, entityId?: string): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      entityId
        ? sql`${auditLogs.module} = 'TOURISM' and ${auditLogs.action} = ${action} and ${auditLogs.entityId} = ${entityId}`
        : sql`${auditLogs.module} = 'TOURISM' and ${auditLogs.action} = ${action}`,
    );

  return rows[0]?.count ?? 0;
};

export const getDestinationById = async (db: Database, destinationId: string) => {
  const rows = await db.select().from(destinations).where(eq(destinations.id, destinationId)).limit(1);
  return rows[0] ?? null;
};
