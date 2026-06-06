import { randomUUID } from 'crypto';

import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { waterStatusEnum } from './enums';
import { waterAssets } from './water-assets';

export const waterAlerts = pgTable(
  'water_alerts',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    waterAssetId: uuid('water_asset_id')
      .notNull()
      .references(() => waterAssets.id, { onDelete: 'cascade' }),
    status: waterStatusEnum('status').notNull(),
    message: text('message').notNull(),
    resolved: boolean('resolved').notNull().default(false),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assetIndex: index('idx_water_alerts_asset_id').on(table.waterAssetId),
    resolvedIndex: index('idx_water_alerts_resolved').on(table.resolved),
  }),
);

export type WaterAlertRow = typeof waterAlerts.$inferSelect;
export type NewWaterAlertRow = typeof waterAlerts.$inferInsert;
