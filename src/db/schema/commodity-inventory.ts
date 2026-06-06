import { randomUUID } from 'crypto';

import { index, numeric, pgTable, uuid } from 'drizzle-orm/pg-core';

import { commodities } from './commodities';
import { fishermen } from './fishermen';
import { timestamps } from './timestamps';
import { users } from './users';

export const commodityInventory = pgTable(
  'commodity_inventory',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    fishermanId: uuid('fisherman_id')
      .notNull()
      .references(() => fishermen.id, { onDelete: 'restrict' }),
    commodityId: uuid('commodity_id')
      .notNull()
      .references(() => commodities.id, { onDelete: 'restrict' }),
    availableWeightKg: numeric('available_weight_kg', { precision: 10, scale: 2 }).notNull(),
    pricePerKg: numeric('price_per_kg', { precision: 12, scale: 2 }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => ({
    fishermanIndex: index('idx_commodity_inventory_fisherman_id').on(table.fishermanId),
    commodityIndex: index('idx_commodity_inventory_commodity_id').on(table.commodityId),
  }),
);

export type CommodityInventoryRow = typeof commodityInventory.$inferSelect;
export type NewCommodityInventoryRow = typeof commodityInventory.$inferInsert;
