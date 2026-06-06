import { randomUUID } from 'crypto';

import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const notificationLogs = pgTable(
  'notification_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    channel: varchar('channel', { length: 50 }).notNull(),
    payload: jsonb('payload').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIndex: index('idx_notification_logs_event_name').on(table.eventName),
  }),
);

export type NotificationLogRow = typeof notificationLogs.$inferSelect;
export type NewNotificationLogRow = typeof notificationLogs.$inferInsert;
