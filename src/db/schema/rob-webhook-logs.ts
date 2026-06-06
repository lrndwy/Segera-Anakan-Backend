import { randomUUID } from 'crypto';

import { index, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const robWebhookLogs = pgTable(
  'rob_webhook_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    eventName: varchar('event_name', { length: 100 }).notNull(),
    payload: jsonb('payload').notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIndex: index('rob_webhook_logs_event_name_idx').on(table.eventName),
  }),
);

export type RobWebhookLogRow = typeof robWebhookLogs.$inferSelect;
export type NewRobWebhookLogRow = typeof robWebhookLogs.$inferInsert;
