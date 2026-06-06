import { randomUUID } from 'crypto';

import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { timestamps } from './timestamps';
import { users } from './users';

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshToken: text('refresh_token').notNull(),
    expiredAt: timestamp('expired_at', { withTimezone: true }).notNull(),
    createdAt: timestamps.createdAt,
  },
  (table) => ({
    userIndex: index('user_sessions_user_id_idx').on(table.userId),
    expiredIndex: index('user_sessions_expired_at_idx').on(table.expiredAt),
  }),
);

export type UserSessionRow = typeof userSessions.$inferSelect;
export type NewUserSessionRow = typeof userSessions.$inferInsert;
