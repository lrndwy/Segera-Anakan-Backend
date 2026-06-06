import { randomUUID } from 'crypto';

import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { agencies } from './agencies';
import { users } from './users';

export const agencyNotificationLogs = pgTable(
  'agency_notification_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    agencyId: uuid('agency_id')
      .notNull()
      .references(() => agencies.id, { onDelete: 'cascade' }),
    channel: varchar('channel', { length: 50 }).notNull(),
    subject: varchar('subject', { length: 255 }),
    message: text('message').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    response: text('response'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    agencyIndex: index('idx_agency_notification_logs_agency_id').on(table.agencyId),
  }),
);

export type AgencyNotificationLogRow = typeof agencyNotificationLogs.$inferSelect;
export type NewAgencyNotificationLogRow = typeof agencyNotificationLogs.$inferInsert;
