import { randomUUID } from 'crypto';

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { robStatusEnum } from './enums';
import { users } from './users';

export const robManualOverrides = pgTable(
  'rob_manual_overrides',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    status: robStatusEnum('status').notNull(),
    reason: text('reason').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdByIndex: index('rob_manual_overrides_created_by_idx').on(table.createdBy),
  }),
);

export type RobManualOverrideRow = typeof robManualOverrides.$inferSelect;
export type NewRobManualOverrideRow = typeof robManualOverrides.$inferInsert;
