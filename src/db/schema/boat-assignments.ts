import { randomUUID } from 'crypto';

import { index, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { boatOwners } from './boat-owners';
import { bookings } from './bookings';
import { boatAssignmentStatusEnum } from './enums';
import { users } from './users';

export const boatAssignments = pgTable(
  'boat_assignments',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    boatOwnerId: uuid('boat_owner_id')
      .notNull()
      .references(() => boatOwners.id, { onDelete: 'restrict' }),
    assignedPeople: integer('assigned_people').notNull(),
    status: boatAssignmentStatusEnum('status').notNull().default('CONFIRMED'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid('assigned_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
  },
  (table) => ({
    bookingIndex: index('idx_boat_assignments_booking_id').on(table.bookingId),
    boatOwnerIndex: index('idx_boat_assignments_boat_owner_id').on(table.boatOwnerId),
  }),
);

export type BoatAssignmentRow = typeof boatAssignments.$inferSelect;
export type NewBoatAssignmentRow = typeof boatAssignments.$inferInsert;
