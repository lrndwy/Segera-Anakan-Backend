import { randomUUID } from 'crypto';

import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const commodityCategories = pgTable('commodity_categories', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CommodityCategoryRow = typeof commodityCategories.$inferSelect;
