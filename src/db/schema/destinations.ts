import { randomUUID } from 'crypto';

import { boolean, index, integer, numeric, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { boatAssignmentStatusEnum } from './enums';
import { users } from './users';
import { villages } from './villages';
import { softDeleteTimestamps, timestamps } from './timestamps';

export const destinations = pgTable(
  'destinations',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    villageId: uuid('village_id')
      .notNull()
      .references(() => villages.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description').notNull(),
    pricePerPerson: numeric('price_per_person', { precision: 12, scale: 2 }).notNull(),
    capacityPerDay: integer('capacity_per_day').notNull(),
    maxPeoplePerBooking: integer('max_people_per_booking').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
    ...timestamps,
    ...softDeleteTimestamps,
  },
  (table) => ({
    villageIndex: index('idx_destinations_village_id').on(table.villageId),
  }),
);

export type DestinationRow = typeof destinations.$inferSelect;
export type NewDestinationRow = typeof destinations.$inferInsert;
