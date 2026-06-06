import { and, count, desc, eq, ilike, ne, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { bookings, destinations, type BookingRow } from '../../db/schema';

export type FindBookingsInput = {
  page: number;
  limit: number;
  offset: number;
  villageId?: string | undefined;
  status?: string | undefined;
};

export class BookingRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(bookingId: string): Promise<BookingRow | null> {
    const rows = await this.db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    return rows[0] ?? null;
  }

  async findByIdWithDestination(bookingId: string) {
    const rows = await this.db
      .select({ booking: bookings, destinationName: destinations.name })
      .from(bookings)
      .innerJoin(destinations, eq(bookings.destinationId, destinations.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);

    return rows[0] ?? null;
  }

  async findAll(input: FindBookingsInput) {
    const conditions = [];

    if (input.villageId) {
      conditions.push(eq(bookings.villageId, input.villageId));
    }

    if (input.status) {
      conditions.push(eq(bookings.status, input.status as typeof bookings.$inferSelect.status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db
      .select({ booking: bookings, destinationName: destinations.name })
      .from(bookings)
      .innerJoin(destinations, eq(bookings.destinationId, destinations.id))
      .where(whereClause)
      .orderBy(desc(bookings.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(bookings).where(whereClause);

    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async countByInvoiceDatePrefix(datePrefix: string): Promise<number> {
    const rows = await this.db
      .select({ count: count() })
      .from(bookings)
      .where(ilike(bookings.invoiceNumber, `INV-${datePrefix}-%`));

    return rows[0]?.count ?? 0;
  }

  async create(input: typeof bookings.$inferInsert): Promise<BookingRow> {
    const rows = await this.db.insert(bookings).values(input).returning();
    return rows[0] as BookingRow;
  }

  async updateStatus(bookingId: string, status: typeof bookings.$inferSelect.status): Promise<BookingRow | null> {
    const rows = await this.db
      .update(bookings)
      .set({ status, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId))
      .returning();

    return rows[0] ?? null;
  }

  async sumPeopleOnDate(destinationId: string, bookingDate: string): Promise<number> {
    const rows = await this.db
      .select({ total: sql<number>`coalesce(sum(${bookings.totalPeople}), 0)` })
      .from(bookings)
      .where(
        and(
          eq(bookings.destinationId, destinationId),
          eq(bookings.bookingDate, bookingDate),
          ne(bookings.status, 'CANCELLED'),
        ),
      );

    return Number(rows[0]?.total ?? 0);
  }
}
