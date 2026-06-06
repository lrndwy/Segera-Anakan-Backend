import { randomUUID } from 'crypto';

import { bigint, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users';

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    bucket: text('bucket').notNull(),
    objectName: text('object_name').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    url: text('url').notNull(),
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uploadedByIndex: index('files_uploaded_by_idx').on(table.uploadedBy),
  }),
);

export type FileRow = typeof files.$inferSelect;
export type NewFileRow = typeof files.$inferInsert;
