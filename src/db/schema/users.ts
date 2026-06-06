import { randomUUID } from 'crypto';

import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { userRoleEnum, userStatusEnum } from './enums';
import { softDeleteTimestamps, timestamps } from './timestamps';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    villageId: uuid('village_id'),
    fullName: text('full_name').notNull(),
    email: text('email').notNull().unique(),
    phone: text('phone').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull(),
    status: userStatusEnum('status').notNull().default('ACTIVE'),
    refreshTokenVersion: integer('refresh_token_version').notNull().default(1),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    ...timestamps,
    ...softDeleteTimestamps,
  },
  (table) => ({
    emailIndex: index('users_email_idx').on(table.email),
    roleIndex: index('idx_users_role').on(table.role),
    villageIndex: index('idx_users_village_id').on(table.villageId),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
