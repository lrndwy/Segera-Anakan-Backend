import { randomUUID } from 'crypto';

import { integer, numeric, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { robStatusEnum } from './enums';

export const robCurrentStatus = pgTable('rob_current_status', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  status: robStatusEnum('status').notNull(),
  score: integer('score').notNull(),
  waveHeight: numeric('wave_height', { precision: 10, scale: 2 }).notNull(),
  tideHeight: numeric('tide_height', { precision: 10, scale: 2 }).notNull(),
  rainfall: numeric('rainfall', { precision: 10, scale: 2 }).notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type RobCurrentStatusRow = typeof robCurrentStatus.$inferSelect;
export type NewRobCurrentStatusRow = typeof robCurrentStatus.$inferInsert;
