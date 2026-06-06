import { randomUUID } from 'crypto';

import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    module: text('module').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    oldData: jsonb('old_data'),
    newData: jsonb('new_data'),
    ipAddress: text('ip_address').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIndex: index('audit_logs_user_id_idx').on(table.userId),
    entityIndex: index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    moduleIndex: index('audit_logs_module_idx').on(table.module),
  }),
);

export type AuditLogRow = typeof auditLogs.$inferSelect;
export type NewAuditLogRow = typeof auditLogs.$inferInsert;
