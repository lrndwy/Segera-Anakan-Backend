import { randomUUID } from 'crypto';

import { boolean, index, integer, numeric, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { softDeleteTimestamps, timestamps } from './timestamps';
import { villages } from './villages';

export const waterAssets = pgTable(
  'water_assets',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    villageId: uuid('village_id')
      .notNull()
      .references(() => villages.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    locationName: varchar('location_name', { length: 255 }).notNull(),
    latitude: numeric('latitude', { precision: 10, scale: 7 }).notNull(),
    longitude: numeric('longitude', { precision: 10, scale: 7 }).notNull(),
    capacityLiter: integer('capacity_liter').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
    ...softDeleteTimestamps,
  },
  (table) => ({
    villageIndex: index('idx_water_assets_village_id').on(table.villageId),
  }),
);

export type WaterAssetRow = typeof waterAssets.$inferSelect;
export type NewWaterAssetRow = typeof waterAssets.$inferInsert;
