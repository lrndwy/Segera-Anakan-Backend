import { randomUUID } from 'crypto';

import { index, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { files } from './files';
import { softDeleteTimestamps, timestamps } from './timestamps';

export const villages = pgTable(
  'villages',
  {
    id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    qrisFileId: uuid('qris_file_id').references(() => files.id, { onDelete: 'set null' }),
    contactName: varchar('contact_name', { length: 255 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 30 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    bmkgRegionCode: varchar('bmkg_region_code', { length: 20 }),
    ...timestamps,
    ...softDeleteTimestamps,
  },
  (table) => ({
    nameIndex: index('idx_villages_name').on(table.name),
  }),
);

export type VillageRow = typeof villages.$inferSelect;
export type NewVillageRow = typeof villages.$inferInsert;
