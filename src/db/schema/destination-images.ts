import { randomUUID } from 'crypto';

import { index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { destinations } from './destinations';
import { files } from './files';

export const destinationImages = pgTable(
  'destination_images',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    destinationId: uuid('destination_id')
      .notNull()
      .references(() => destinations.id, { onDelete: 'cascade' }),
    fileId: uuid('file_id')
      .notNull()
      .references(() => files.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    destinationIndex: index('idx_destination_images_destination_id').on(table.destinationId),
  }),
);

export type DestinationImageRow = typeof destinationImages.$inferSelect;
export type NewDestinationImageRow = typeof destinationImages.$inferInsert;
