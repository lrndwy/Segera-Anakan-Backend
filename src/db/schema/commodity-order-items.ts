import { randomUUID } from 'crypto';

import { index, numeric, pgTable, uuid } from 'drizzle-orm/pg-core';

import { commodityInventory } from './commodity-inventory';
import { commodityOrders } from './commodity-orders';

export const commodityOrderItems = pgTable(
  'commodity_order_items',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    commodityOrderId: uuid('commodity_order_id')
      .notNull()
      .references(() => commodityOrders.id, { onDelete: 'cascade' }),
    inventoryId: uuid('inventory_id')
      .notNull()
      .references(() => commodityInventory.id, { onDelete: 'restrict' }),
    quantityKg: numeric('quantity_kg', { precision: 10, scale: 2 }).notNull(),
    pricePerKg: numeric('price_per_kg', { precision: 12, scale: 2 }).notNull(),
    subtotal: numeric('subtotal', { precision: 12, scale: 2 }).notNull(),
  },
  (table) => ({
    orderIndex: index('idx_commodity_order_items_order_id').on(table.commodityOrderId),
  }),
);

export type CommodityOrderItemRow = typeof commodityOrderItems.$inferSelect;
export type NewCommodityOrderItemRow = typeof commodityOrderItems.$inferInsert;
