import { randomUUID } from 'crypto';

import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { commodityOrders } from './commodity-orders';
import { paymentStatusEnum } from './enums';
import { files } from './files';
import { users } from './users';

export const commodityPayments = pgTable(
  'commodity_payments',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    commodityOrderId: uuid('commodity_order_id')
      .notNull()
      .references(() => commodityOrders.id, { onDelete: 'cascade' }),
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
    orderIndex: index('idx_commodity_payments_order_id').on(table.commodityOrderId),
  }),
);

export type CommodityPaymentRow = typeof commodityPayments.$inferSelect;
export type NewCommodityPaymentRow = typeof commodityPayments.$inferInsert;
