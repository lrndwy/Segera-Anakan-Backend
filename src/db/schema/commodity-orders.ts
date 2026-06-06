import { randomUUID } from 'crypto';

import { index, numeric, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

import { commodityOrderStatusEnum } from './enums';
import { timestamps } from './timestamps';
import { villages } from './villages';

export const commodityOrders = pgTable(
  'commodity_orders',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
    villageId: uuid('village_id')
      .notNull()
      .references(() => villages.id, { onDelete: 'restrict' }),
    buyerName: varchar('buyer_name', { length: 255 }).notNull(),
    buyerPhone: varchar('buyer_phone', { length: 30 }).notNull(),
    buyerEmail: varchar('buyer_email', { length: 255 }).notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    status: commodityOrderStatusEnum('status').notNull().default('PENDING_PAYMENT'),
    ...timestamps,
  },
  (table) => ({
    villageIndex: index('idx_commodity_orders_village_id').on(table.villageId),
    statusIndex: index('idx_commodity_orders_status').on(table.status),
  }),
);

export type CommodityOrderRow = typeof commodityOrders.$inferSelect;
export type NewCommodityOrderRow = typeof commodityOrders.$inferInsert;
