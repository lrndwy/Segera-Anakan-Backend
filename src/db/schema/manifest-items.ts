import { randomUUID } from 'crypto';

import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { commodityOrders } from './commodity-orders';
import { manifests } from './manifests';

export const manifestItems = pgTable(
  'manifest_items',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    manifestId: uuid('manifest_id')
      .notNull()
      .references(() => manifests.id, { onDelete: 'cascade' }),
    commodityOrderId: uuid('commodity_order_id')
      .notNull()
      .unique()
      .references(() => commodityOrders.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    manifestIndex: index('idx_manifest_items_manifest_id').on(table.manifestId),
  }),
);

export type ManifestItemRow = typeof manifestItems.$inferSelect;
export type NewManifestItemRow = typeof manifestItems.$inferInsert;
