import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { BookingStatus, CommodityOrderStatus } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { bookings, commodityOrders } from '../../db/schema';

const REVENUE_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED] as const;
const ORDER_REVENUE_STATUSES = [CommodityOrderStatus.CONFIRMED, CommodityOrderStatus.COMPLETED] as const;

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
};

export type DailyMetricRow = {
  date: string;
  revenue: number;
  visitors: number;
  confirmed: number;
};

export class ReportsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getDailyMetrics(
    villageId: string | undefined,
    startDate: Date,
    endDate: Date,
  ): Promise<DailyMetricRow[]> {
    const bookingConditions = [
      inArray(bookings.status, [...REVENUE_STATUSES]),
      gte(bookings.createdAt, startDate),
      lte(bookings.createdAt, endDate),
    ];

    if (villageId) {
      bookingConditions.push(eq(bookings.villageId, villageId));
    }

    const orderConditions = [
      inArray(commodityOrders.status, [...ORDER_REVENUE_STATUSES]),
      gte(commodityOrders.createdAt, startDate),
      lte(commodityOrders.createdAt, endDate),
    ];

    if (villageId) {
      orderConditions.push(eq(commodityOrders.villageId, villageId));
    }

    const confirmedBookingConditions = [
      eq(bookings.status, BookingStatus.CONFIRMED),
      gte(bookings.createdAt, startDate),
      lte(bookings.createdAt, endDate),
    ];

    if (villageId) {
      confirmedBookingConditions.push(eq(bookings.villageId, villageId));
    }

    const bookingRows = await this.db
      .select({
        date: sql<string>`to_char(${bookings.createdAt}::date, 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${bookings.totalAmount}), 0)`,
        visitors: sql<string>`coalesce(sum(${bookings.totalPeople}), 0)`,
      })
      .from(bookings)
      .where(and(...bookingConditions))
      .groupBy(sql`${bookings.createdAt}::date`);

    const confirmedBookingRows = await this.db
      .select({
        date: sql<string>`to_char(${bookings.createdAt}::date, 'YYYY-MM-DD')`,
        confirmed: sql<string>`coalesce(sum(${bookings.totalPeople}), 0)`,
      })
      .from(bookings)
      .where(and(...confirmedBookingConditions))
      .groupBy(sql`${bookings.createdAt}::date`);

    const orderRows = await this.db
      .select({
        date: sql<string>`to_char(${commodityOrders.createdAt}::date, 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${commodityOrders.totalAmount}), 0)`,
      })
      .from(commodityOrders)
      .where(and(...orderConditions))
      .groupBy(sql`${commodityOrders.createdAt}::date`);

    const byDate = new Map<string, { revenue: number; visitors: number; confirmed: number }>();

    for (const row of bookingRows) {
      const existing = byDate.get(row.date) ?? { revenue: 0, visitors: 0, confirmed: 0 };
      byDate.set(row.date, {
        revenue: existing.revenue + toNumber(row.revenue),
        visitors: existing.visitors + toNumber(row.visitors),
        confirmed: existing.confirmed,
      });
    }

    for (const row of confirmedBookingRows) {
      const existing = byDate.get(row.date) ?? { revenue: 0, visitors: 0, confirmed: 0 };
      byDate.set(row.date, {
        revenue: existing.revenue,
        visitors: existing.visitors,
        confirmed: existing.confirmed + toNumber(row.confirmed),
      });
    }

    for (const row of orderRows) {
      const existing = byDate.get(row.date) ?? { revenue: 0, visitors: 0, confirmed: 0 };
      byDate.set(row.date, {
        revenue: existing.revenue + toNumber(row.revenue),
        visitors: existing.visitors,
        confirmed: existing.confirmed,
      });
    }

    return [...byDate.entries()]
      .map(([date, metrics]) => ({
        date,
        revenue: metrics.revenue,
        visitors: metrics.visitors,
        confirmed: metrics.confirmed,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
