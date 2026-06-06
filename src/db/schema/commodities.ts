import { randomUUID } from 'crypto';

import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { commodityCategories } from './commodity-categories';

export const commodities = pgTable('commodities', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  categoryId: uuid('category_id')
    .notNull()
    .references(() => commodityCategories.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type CommodityRow = typeof commodities.$inferSelect;
