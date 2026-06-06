import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { fishermen, type FishermanRow } from '../../db/schema';

export type FindFishermenInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
  villageId?: string | undefined;
};

export class FishermanRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(fishermanId: string): Promise<FishermanRow | null> {
    const rows = await this.db
      .select()
      .from(fishermen)
      .where(and(eq(fishermen.id, fishermanId), isNull(fishermen.deletedAt)))
      .limit(1);
    return rows[0] ?? null;
  }

  async findAll(input: FindFishermenInput): Promise<{ items: FishermanRow[]; totalItems: number }> {
    const conditions = [isNull(fishermen.deletedAt)];

    if (input.villageId) conditions.push(eq(fishermen.villageId, input.villageId));

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(or(ilike(fishermen.fullName, keyword), ilike(fishermen.phone, keyword))!);
    }

    const whereClause = and(...conditions);
    const items = await this.db
      .select()
      .from(fishermen)
      .where(whereClause)
      .orderBy(desc(fishermen.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(fishermen).where(whereClause);
    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async create(input: typeof fishermen.$inferInsert): Promise<FishermanRow> {
    const rows = await this.db.insert(fishermen).values(input).returning();
    return rows[0] as FishermanRow;
  }

  async update(fishermanId: string, input: Partial<typeof fishermen.$inferInsert>): Promise<FishermanRow | null> {
    const rows = await this.db
      .update(fishermen)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(fishermen.id, fishermanId), isNull(fishermen.deletedAt)))
      .returning();
    return rows[0] ?? null;
  }

  async softDelete(fishermanId: string): Promise<FishermanRow | null> {
    const rows = await this.db
      .update(fishermen)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(fishermen.id, fishermanId), isNull(fishermen.deletedAt)))
      .returning();
    return rows[0] ?? null;
  }
}
