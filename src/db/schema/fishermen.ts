import { randomUUID } from 'crypto';

import { boolean, index, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

import { villages } from './villages';
import { softDeleteTimestamps, timestamps } from './timestamps';

export const fishermen = pgTable(
  'fishermen',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    villageId: uuid('village_id')
      .notNull()
      .references(() => villages.id, { onDelete: 'restrict' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    isActive: boolean('is_active').notNull().default(true),
    ...timestamps,
    ...softDeleteTimestamps,
  },
  (table) => ({
    villageIndex: index('idx_fishermen_village_id').on(table.villageId),
  }),
);

export type FishermanRow = typeof fishermen.$inferSelect;
export type NewFishermanRow = typeof fishermen.$inferInsert;
