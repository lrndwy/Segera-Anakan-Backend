import { and, count, desc, eq, ilike, or } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { settings, type SettingRow } from '../../db/schema';

export type FindSettingsInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
};

export class SettingsRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByKey(key: string): Promise<SettingRow | null> {
    const rows = await this.db.select().from(settings).where(eq(settings.key, key)).limit(1);
    return rows[0] ?? null;
  }

  async findAll(input: FindSettingsInput): Promise<{ items: SettingRow[]; totalItems: number }> {
    const conditions = [];

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(
        or(
          ilike(settings.key, keyword),
          ilike(settings.value, keyword),
          ilike(settings.description, keyword),
        )!,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db
      .select()
      .from(settings)
      .where(whereClause)
      .orderBy(desc(settings.updatedAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(settings).where(whereClause);

    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async create(input: typeof settings.$inferInsert): Promise<SettingRow> {
    const rows = await this.db.insert(settings).values(input).returning();
    return rows[0] as SettingRow;
  }

  async update(key: string, input: Partial<Pick<SettingRow, 'value' | 'description'>>): Promise<SettingRow | null> {
    const rows = await this.db
      .update(settings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();

    return rows[0] ?? null;
  }

  async delete(key: string): Promise<SettingRow | null> {
    const rows = await this.db.delete(settings).where(eq(settings.key, key)).returning();
    return rows[0] ?? null;
  }
}
