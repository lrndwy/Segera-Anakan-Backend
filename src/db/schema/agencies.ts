import { randomUUID } from 'crypto';

import { boolean, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

import { agencyTypeEnum } from './enums';
import { softDeleteTimestamps, timestamps } from './timestamps';

export const agencies = pgTable('agencies', {
  id: uuid('id').primaryKey().$defaultFn(() => randomUUID()),
  name: varchar('name', { length: 255 }).notNull(),
  agencyType: agencyTypeEnum('agency_type').notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 30 }),
  isActive: boolean('is_active').notNull().default(true),
  ...timestamps,
  ...softDeleteTimestamps,
});

export type AgencyRow = typeof agencies.$inferSelect;
export type NewAgencyRow = typeof agencies.$inferInsert;
