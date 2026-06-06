import { randomUUID } from 'crypto';

import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SettingRow = typeof settings.$inferSelect;
export type NewSettingRow = typeof settings.$inferInsert;
