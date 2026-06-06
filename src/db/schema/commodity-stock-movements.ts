import { randomUUID } from 'crypto';

import { index, numeric, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { commodityInventory } from './commodity-inventory';
import { movementTypeEnum } from './enums';
import { users } from './users';

export const commodityStockMovements = pgTable(
  'commodity_stock_movements',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    inventoryId: uuid('inventory_id')
      .notNull()
      .references(() => commodityInventory.id, { onDelete: 'cascade' }),
    movementType: movementTypeEnum('movement_type').notNull(),
    quantityKg: numeric('quantity_kg', { precision: 10, scale: 2 }).notNull(),
    previousStockKg: numeric('previous_stock_kg', { precision: 10, scale: 2 }).notNull(),
    newStockKg: numeric('new_stock_kg', { precision: 10, scale: 2 }).notNull(),
    referenceType: varchar('reference_type', { length: 100 }).notNull(),
    referenceId: uuid('reference_id'),
    notes: text('notes'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    inventoryIndex: index('idx_commodity_stock_movements_inventory_id').on(table.inventoryId),
  }),
);

export type CommodityStockMovementRow = typeof commodityStockMovements.$inferSelect;
export type NewCommodityStockMovementRow = typeof commodityStockMovements.$inferInsert;
