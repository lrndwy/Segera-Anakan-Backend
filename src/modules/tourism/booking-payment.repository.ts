import { desc, eq } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { bookingPayments, type BookingPaymentRow } from '../../db/schema';

export class BookingPaymentRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findLatestByBookingId(bookingId: string): Promise<BookingPaymentRow | null> {
    const rows = await this.db
      .select()
      .from(bookingPayments)
      .where(eq(bookingPayments.bookingId, bookingId))
      .orderBy(desc(bookingPayments.createdAt))
      .limit(1);

    return rows[0] ?? null;
  }

  async create(input: typeof bookingPayments.$inferInsert): Promise<BookingPaymentRow> {
    const rows = await this.db.insert(bookingPayments).values(input).returning();
    return rows[0] as BookingPaymentRow;
  }

  async verifyPayment(paymentId: string, verifiedBy: string): Promise<BookingPaymentRow | null> {
    const rows = await this.db
      .update(bookingPayments)
      .set({
        paymentStatus: 'VERIFIED',
        verifiedBy,
        verifiedAt: new Date(),
      })
      .where(eq(bookingPayments.id, paymentId))
      .returning();

    return rows[0] ?? null;
  }
}
