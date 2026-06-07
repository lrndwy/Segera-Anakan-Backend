import { and, count, eq, gte, inArray, isNull, lt, sql } from 'drizzle-orm';

import { BookingStatus, CommodityOrderStatus } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { bookings, commodities, commodityOrders, fishermen } from '../../db/schema';

const REVENUE_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] as const;
const ORDER_REVENUE_STATUSES = [CommodityOrderStatus.CONFIRMED, CommodityOrderStatus.COMPLETED] as const;

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
};

export class DashboardRepository {
  constructor(private readonly db: DatabaseClient) {}

  async sumRevenue(villageId: string | undefined, start: Date, end: Date): Promise<number> {
    const bookingConditions = [
      inArray(bookings.status, [...REVENUE_STATUSES]),
      gte(bookings.createdAt, start),
      lt(bookings.createdAt, end),
    ];
    if (villageId) bookingConditions.push(eq(bookings.villageId, villageId));

    const orderConditions = [
      inArray(commodityOrders.status, [...ORDER_REVENUE_STATUSES]),
      gte(commodityOrders.createdAt, start),
      lt(commodityOrders.createdAt, end),
    ];
    if (villageId) orderConditions.push(eq(commodityOrders.villageId, villageId));

    const [bookingSum] = await this.db
      .select({ total: sql<string>`coalesce(sum(${bookings.totalAmount}), 0)` })
      .from(bookings)
      .where(and(...bookingConditions));

    const [orderSum] = await this.db
      .select({ total: sql<string>`coalesce(sum(${commodityOrders.totalAmount}), 0)` })
      .from(commodityOrders)
      .where(and(...orderConditions));

    return toNumber(bookingSum?.total) + toNumber(orderSum?.total);
  }

  async countActiveBookings(villageId: string | undefined): Promise<number> {
    const conditions = [eq(bookings.status, BookingStatus.CONFIRMED)];
    if (villageId) conditions.push(eq(bookings.villageId, villageId));

    const [row] = await this.db.select({ count: count() }).from(bookings).where(and(...conditions));
    return row?.count ?? 0;
  }

  async countFishermen(villageId: string | undefined): Promise<number> {
    const conditions = [isNull(fishermen.deletedAt)];
    if (villageId) conditions.push(eq(fishermen.villageId, villageId));

    const [row] = await this.db.select({ count: count() }).from(fishermen).where(and(...conditions));
    return row?.count ?? 0;
  }

  async countCommodities(): Promise<number> {
    const [row] = await this.db.select({ count: count() }).from(commodities);
    return row?.count ?? 0;
  }

  async countBookings(villageId: string | undefined, start: Date, end: Date): Promise<number> {
    const conditions = [gte(bookings.createdAt, start), lt(bookings.createdAt, end)];
    if (villageId) conditions.push(eq(bookings.villageId, villageId));

    const [row] = await this.db.select({ count: count() }).from(bookings).where(and(...conditions));
    return row?.count ?? 0;
  }
}
