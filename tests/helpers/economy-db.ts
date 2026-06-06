import { desc, eq, inArray, sql } from 'drizzle-orm';

import type { Database } from '../../src/db/client';
import {
  auditLogs,
  commodityInventory,
  commodityOrderItems,
  commodityOrders,
  commodityPayments,
  commodityStockMovements,
  fishermen,
  files,
  manifestItems,
  manifests,
} from '../../src/db/schema';
import { generateUuid } from '../../src/lib/crypto';
import { VILLAGE_UJUNGGAGAK, VILLAGE_UJUNGALANG } from './test-users';

const TEST_VILLAGES = [VILLAGE_UJUNGGAGAK, VILLAGE_UJUNGALANG] as const;

export const ECONOMY_TEST_FILE_BUCKET = 'test-economy';

export const SEED_COMMODITY_IKAN_BANDENG = 'b1000000-0000-4000-8000-000000000001';

export const resetEconomyTestData = async (db: Database): Promise<void> => {
  const villageManifests = await db
    .select({ id: manifests.id })
    .from(manifests)
    .where(inArray(manifests.villageId, [...TEST_VILLAGES]));

  const manifestIds = villageManifests.map((row) => row.id);
  if (manifestIds.length > 0) {
    await db.delete(manifestItems).where(inArray(manifestItems.manifestId, manifestIds));
    await db.delete(manifests).where(inArray(manifests.id, manifestIds));
  }

  const villageOrders = await db
    .select({ id: commodityOrders.id })
    .from(commodityOrders)
    .where(inArray(commodityOrders.villageId, [...TEST_VILLAGES]));

  const orderIds = villageOrders.map((row) => row.id);
  if (orderIds.length > 0) {
    await db.delete(commodityPayments).where(inArray(commodityPayments.commodityOrderId, orderIds));
    await db.delete(commodityOrderItems).where(inArray(commodityOrderItems.commodityOrderId, orderIds));
    await db.delete(commodityOrders).where(inArray(commodityOrders.id, orderIds));
  }

  const villageFishermen = await db
    .select({ id: fishermen.id })
    .from(fishermen)
    .where(inArray(fishermen.villageId, [...TEST_VILLAGES]));

  const fishermanIds = villageFishermen.map((row) => row.id);
  if (fishermanIds.length > 0) {
    await db.delete(commodityInventory).where(inArray(commodityInventory.fishermanId, fishermanIds));
    await db.delete(fishermen).where(inArray(fishermen.id, fishermanIds));
  }

  await db.delete(auditLogs).where(eq(auditLogs.module, 'ECONOMY'));
  await db.delete(files).where(eq(files.bucket, ECONOMY_TEST_FILE_BUCKET));
};

export const createTestPaymentFile = async (db: Database): Promise<string> => {
  const id = generateUuid();

  await db.insert(files).values({
    id,
    bucket: ECONOMY_TEST_FILE_BUCKET,
    objectName: `payments/${id}.jpg`,
    originalName: 'payment-proof.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    url: `http://localhost:9000/${ECONOMY_TEST_FILE_BUCKET}/payments/${id}.jpg`,
  });

  return id;
};

export const getInventoryById = async (db: Database, inventoryId: string) => {
  const rows = await db.select().from(commodityInventory).where(eq(commodityInventory.id, inventoryId)).limit(1);
  return rows[0] ?? null;
};

export const getOrderById = async (db: Database, orderId: string) => {
  const rows = await db.select().from(commodityOrders).where(eq(commodityOrders.id, orderId)).limit(1);
  return rows[0] ?? null;
};

export const getLatestOrderPayment = async (db: Database, orderId: string) => {
  const rows = await db
    .select()
    .from(commodityPayments)
    .where(eq(commodityPayments.commodityOrderId, orderId))
    .orderBy(desc(commodityPayments.createdAt))
    .limit(1);

  return rows[0] ?? null;
};

export const getStockMovements = async (db: Database, inventoryId: string) => {
  return db
    .select()
    .from(commodityStockMovements)
    .where(eq(commodityStockMovements.inventoryId, inventoryId))
    .orderBy(desc(commodityStockMovements.createdAt));
};

export const getManifestById = async (db: Database, manifestId: string) => {
  const rows = await db.select().from(manifests).where(eq(manifests.id, manifestId)).limit(1);
  return rows[0] ?? null;
};

export const getManifestItems = async (db: Database, manifestId: string) => {
  return db.select().from(manifestItems).where(eq(manifestItems.manifestId, manifestId));
};

export const countEconomyAuditLogs = async (db: Database, action: string, entityId?: string): Promise<number> => {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(
      entityId
        ? sql`${auditLogs.module} = 'ECONOMY' and ${auditLogs.action} = ${action} and ${auditLogs.entityId} = ${entityId}`
        : sql`${auditLogs.module} = 'ECONOMY' and ${auditLogs.action} = ${action}`,
    );

  return rows[0]?.count ?? 0;
};
