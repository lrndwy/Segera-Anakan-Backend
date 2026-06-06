import { randomUUID } from 'crypto';

import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { villages } from './villages';
import { softDeleteTimestamps, timestamps } from './timestamps';

export const boatOwners = pgTable(
  'boat_owners',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    villageId: uuid('village_id')
      .notNull()
      .references(() => villages.id, { onDelete: 'restrict' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 30 }).notNull(),
    boatName: varchar('boat_name', { length: 255 }).notNull(),
    boatCapacity: integer('boat_capacity').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    lastAssignedAt: timestamp('last_assigned_at', { withTimezone: true }),
    ...timestamps,
    ...softDeleteTimestamps,
  },
  (table) => ({
    villageIndex: index('idx_boat_owners_village_id').on(table.villageId),
  }),
);

export type BoatOwnerRow = typeof boatOwners.$inferSelect;
export type NewBoatOwnerRow = typeof boatOwners.$inferInsert;
