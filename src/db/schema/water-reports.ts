import { randomUUID } from 'crypto';

import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { waterConditionEnum, waterStatusEnum } from './enums';
import { users } from './users';
import { waterAssets } from './water-assets';

export const waterReports = pgTable(
  'water_reports',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    waterAssetId: uuid('water_asset_id')
      .notNull()
      .references(() => waterAssets.id, { onDelete: 'cascade' }),
    submittedBy: uuid('submitted_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    volumePercent: integer('volume_percent').notNull(),
    waterCondition: waterConditionEnum('water_condition').notNull(),
    estimatedDaysLeft: integer('estimated_days_left').notNull(),
    status: waterStatusEnum('status').notNull(),
    notes: text('notes'),
    reportedAt: timestamp('reported_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assetIndex: index('idx_water_reports_asset_id').on(table.waterAssetId),
    reportedAtIndex: index('idx_water_reports_reported_at').on(table.reportedAt),
  }),
);

export type WaterReportRow = typeof waterReports.$inferSelect;
export type NewWaterReportRow = typeof waterReports.$inferInsert;
