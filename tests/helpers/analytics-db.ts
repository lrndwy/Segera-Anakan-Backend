import { eq, inArray } from 'drizzle-orm';

import { BookingStatus, CommodityOrderStatus } from '../../src/constants';
import type { Database } from '../../src/db/client';
import {
  boatAssignments,
  bookingPayments,
  bookings,
  commodityInventory,
  commodityOrderItems,
  commodityOrders,
  commodityPayments,
  destinations,
  fishermen,
  manifestItems,
  manifests,
} from '../../src/db/schema';
import { generateUuid } from '../../src/lib/crypto';
import { TEST_USER_IDS, VILLAGE_UJUNGGAGAK, VILLAGE_UJUNGALANG } from './test-users';

const TEST_VILLAGES = [
  VILLAGE_UJUNGGAGAK,
  VILLAGE_UJUNGALANG,
  '11111111-1111-4111-8111-111111111103',
  '11111111-1111-4111-8111-111111111104',
] as const;

export const ANALYTICS_DESTINATION_UJUNGGAGAK = 'd1000000-0000-4000-8000-000000000001';
export const ANALYTICS_DESTINATION_UJUNGALANG = 'd1000000-0000-4000-8000-000000000002';

export const resetAnalyticsTestData = async (db: Database): Promise<void> => {
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
  const villageFishermen = await db
    .select({ id: fishermen.id })
    .from(fishermen)
    .where(inArray(fishermen.villageId, [...TEST_VILLAGES]));

  const fishermanIds = villageFishermen.map((row) => row.id);
  if (fishermanIds.length > 0) {
    await db.delete(commodityInventory).where(inArray(commodityInventory.fishermanId, fishermanIds));
    await db.delete(fishermen).where(inArray(fishermen.id, fishermanIds));
  }
  await db.delete(destinations).where(inArray(destinations.id, [ANALYTICS_DESTINATION_UJUNGGAGAK, ANALYTICS_DESTINATION_UJUNGALANG]));
};

const seedDestinations = async (db: Database): Promise<void> => {
  await db
    .insert(destinations)
    .values([
      {
        id: ANALYTICS_DESTINATION_UJUNGGAGAK,
        villageId: VILLAGE_UJUNGGAGAK,
        name: 'Analytics Pantai Ujunggagak',
        description: 'Test destination',
        pricePerPerson: '100000',
        capacityPerDay: 50,
        maxPeoplePerBooking: 10,
        createdBy: TEST_USER_IDS[0],
      },
      {
        id: ANALYTICS_DESTINATION_UJUNGALANG,
        villageId: VILLAGE_UJUNGALANG,
        name: 'Analytics Pantai Ujungalang',
        description: 'Test destination',
        pricePerPerson: '100000',
        capacityPerDay: 50,
        maxPeoplePerBooking: 10,
        createdBy: TEST_USER_IDS[1],
      },
    ])
    .onConflictDoNothing();
};

export const seedAnalyticsFixtures = async (db: Database): Promise<void> => {
  await seedDestinations(db);

  const now = new Date();
  const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 10, 12, 0, 0));
  const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10, 12, 0, 0));
  const reportDate = new Date('2026-06-01T10:00:00.000Z');

  await db.insert(bookings).values([
    {
      id: generateUuid(),
      invoiceNumber: `BK-AN-${generateUuid().slice(0, 8)}`,
      villageId: VILLAGE_UJUNGGAGAK,
      destinationId: ANALYTICS_DESTINATION_UJUNGGAGAK,
      customerName: 'Customer A',
      customerEmail: 'a@example.com',
      customerPhone: '081111111101',
      bookingDate: '2026-06-01',
      totalPeople: 5,
      totalAmount: '100000',
      status: BookingStatus.CONFIRMED,
      createdAt: thisMonth,
    },
    {
      id: generateUuid(),
      invoiceNumber: `BK-AN-${generateUuid().slice(0, 8)}`,
      villageId: VILLAGE_UJUNGALANG,
      destinationId: ANALYTICS_DESTINATION_UJUNGALANG,
      customerName: 'Customer B',
      customerEmail: 'b@example.com',
      customerPhone: '081111111102',
      bookingDate: '2026-06-02',
      totalPeople: 3,
      totalAmount: '200000',
      status: BookingStatus.CONFIRMED,
      createdAt: thisMonth,
    },
    {
      id: generateUuid(),
      invoiceNumber: `BK-AN-${generateUuid().slice(0, 8)}`,
      villageId: VILLAGE_UJUNGGAGAK,
      destinationId: ANALYTICS_DESTINATION_UJUNGGAGAK,
      customerName: 'Customer C',
      customerEmail: 'c@example.com',
      customerPhone: '081111111103',
      bookingDate: '2026-05-01',
      totalPeople: 2,
      totalAmount: '50000',
      status: BookingStatus.COMPLETED,
      createdAt: lastMonth,
    },
    {
      id: generateUuid(),
      invoiceNumber: `BK-AN-${generateUuid().slice(0, 8)}`,
      villageId: VILLAGE_UJUNGGAGAK,
      destinationId: ANALYTICS_DESTINATION_UJUNGGAGAK,
      customerName: 'Customer D',
      customerEmail: 'd@example.com',
      customerPhone: '081111111104',
      bookingDate: '2026-06-01',
      totalPeople: 10,
      totalAmount: '150000',
      status: BookingStatus.CONFIRMED,
      createdAt: reportDate,
    },
  ]);

  await db.insert(commodityOrders).values([
    {
      id: generateUuid(),
      invoiceNumber: `CO-AN-${generateUuid().slice(0, 8)}`,
      villageId: VILLAGE_UJUNGGAGAK,
      buyerName: 'Buyer A',
      buyerPhone: '081222222201',
      buyerEmail: 'buyer-a@example.com',
      totalAmount: '75000',
      status: CommodityOrderStatus.CONFIRMED,
      createdAt: reportDate,
    },
    {
      id: generateUuid(),
      invoiceNumber: `CO-AN-${generateUuid().slice(0, 8)}`,
      villageId: VILLAGE_UJUNGALANG,
      buyerName: 'Buyer B',
      buyerPhone: '081222222202',
      buyerEmail: 'buyer-b@example.com',
      totalAmount: '125000',
      status: CommodityOrderStatus.COMPLETED,
      createdAt: reportDate,
    },
  ]);

  await db.insert(fishermen).values([
    {
      id: generateUuid(),
      villageId: VILLAGE_UJUNGGAGAK,
      fullName: 'Nelayan Ujunggagak',
      phone: '081333333301',
      isActive: true,
    },
    {
      id: generateUuid(),
      villageId: VILLAGE_UJUNGALANG,
      fullName: 'Nelayan Ujungalang',
      phone: '081333333302',
      isActive: true,
    },
  ]);
};

export const countFishermenByVillage = async (db: Database, villageId: string): Promise<number> => {
  const rows = await db.select().from(fishermen).where(eq(fishermen.villageId, villageId));
  return rows.length;
};
