import { randomUUID } from 'crypto';

import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { bookings } from './bookings';
import { paymentStatusEnum } from './enums';
import { files } from './files';
import { users } from './users';

export const bookingPayments = pgTable(
  'booking_payments',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'restrict' }),
    senderName: varchar('sender_name', { length: 255 }).notNull(),
    paymentStatus: paymentStatusEnum('payment_status').notNull().default('PENDING'),
    notes: text('notes'),
    verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    bookingIndex: index('idx_booking_payments_booking_id').on(table.bookingId),
  }),
);

export type BookingPaymentRow = typeof bookingPayments.$inferSelect;
export type NewBookingPaymentRow = typeof bookingPayments.$inferInsert;
