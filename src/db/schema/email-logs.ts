import { randomUUID } from 'crypto';

import { index, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const emailLogs = pgTable(
  'email_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    recipientEmail: varchar('recipient_email', { length: 255 }).notNull(),
    subject: varchar('subject', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recipientIndex: index('idx_email_logs_recipient_email').on(table.recipientEmail),
  }),
);

export type EmailLogRow = typeof emailLogs.$inferSelect;
export type NewEmailLogRow = typeof emailLogs.$inferInsert;
