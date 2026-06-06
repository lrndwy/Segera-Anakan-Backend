import { randomUUID } from 'crypto';

import { date, index, integer, numeric, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

import { bookingStatusEnum } from './enums';
import { destinations } from './destinations';
import { timestamps } from './timestamps';
import { villages } from './villages';

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
    villageId: uuid('village_id')
      .notNull()
      .references(() => villages.id, { onDelete: 'restrict' }),
    destinationId: uuid('destination_id')
      .notNull()
      .references(() => destinations.id, { onDelete: 'restrict' }),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    customerEmail: varchar('customer_email', { length: 255 }).notNull(),
    customerPhone: varchar('customer_phone', { length: 30 }).notNull(),
    bookingDate: date('booking_date').notNull(),
    totalPeople: integer('total_people').notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: bookingStatusEnum('status').notNull().default('PENDING_PAYMENT'),
    ...timestamps,
  },
  (table) => ({
    villageIndex: index('idx_bookings_village_id').on(table.villageId),
    destinationIndex: index('idx_bookings_destination_id').on(table.destinationId),
    statusIndex: index('idx_bookings_status').on(table.status),
  }),
);

export type BookingRow = typeof bookings.$inferSelect;
export type NewBookingRow = typeof bookings.$inferInsert;
