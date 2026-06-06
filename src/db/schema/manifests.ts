import { randomUUID } from 'crypto';

import { date, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { manifestStatusEnum } from './enums';
import { timestamps } from './timestamps';
import { users } from './users';
import { villages } from './villages';

export const manifests = pgTable(
  'manifests',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    villageId: uuid('village_id')
      .notNull()
      .references(() => villages.id, { onDelete: 'restrict' }),
    manifestDate: date('manifest_date').notNull(),
    status: manifestStatusEnum('status').notNull().default('DRAFT'),
    departureTime: timestamp('departure_time', { withTimezone: true }),
    estimatedArrivalTime: timestamp('estimated_arrival_time', { withTimezone: true }),
    confirmedBy: uuid('confirmed_by').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => ({
    villageIndex: index('idx_manifests_village_id').on(table.villageId),
  }),
);

export type ManifestRow = typeof manifests.$inferSelect;
export type NewManifestRow = typeof manifests.$inferInsert;
