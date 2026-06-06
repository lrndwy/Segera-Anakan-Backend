import { randomUUID } from 'crypto';

import { index, integer, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { robStatusEnum } from './enums';

export const robHistories = pgTable(
  'rob_histories',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    status: robStatusEnum('status').notNull(),
    score: integer('score').notNull(),
    waveHeight: numeric('wave_height', { precision: 10, scale: 2 }).notNull(),
    tideHeight: numeric('tide_height', { precision: 10, scale: 2 }).notNull(),
    rainfall: numeric('rainfall', { precision: 10, scale: 2 }).notNull(),
    notes: text('notes'),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    recordedAtIndex: index('rob_histories_recorded_at_idx').on(table.recordedAt),
  }),
);

export type RobHistoryRow = typeof robHistories.$inferSelect;
export type NewRobHistoryRow = typeof robHistories.$inferInsert;
