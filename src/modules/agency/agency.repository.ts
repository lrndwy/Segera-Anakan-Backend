import { and, count, desc, eq, ilike, isNull, or } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { agencies, type AgencyRow } from '../../db/schema';

export type FindAgenciesInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
  agencyType?: string | undefined;
};

export class AgencyRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(agencyId: string): Promise<AgencyRow | null> {
    const rows = await this.db
      .select()
      .from(agencies)
      .where(and(eq(agencies.id, agencyId), isNull(agencies.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  }

  async findAll(input: FindAgenciesInput): Promise<{ items: AgencyRow[]; totalItems: number }> {
    const conditions = [isNull(agencies.deletedAt)];

    if (input.agencyType) {
      conditions.push(eq(agencies.agencyType, input.agencyType as AgencyRow['agencyType']));
    }

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(
        or(
          ilike(agencies.name, keyword),
          ilike(agencies.email, keyword),
          ilike(agencies.phone, keyword),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select()
      .from(agencies)
      .where(whereClause)
      .orderBy(desc(agencies.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(agencies).where(whereClause);

    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async findActiveAgencies(): Promise<AgencyRow[]> {
    return this.db
      .select()
      .from(agencies)
      .where(and(eq(agencies.isActive, true), isNull(agencies.deletedAt)));
  }

  async create(input: typeof agencies.$inferInsert): Promise<AgencyRow> {
    const rows = await this.db.insert(agencies).values(input).returning();
    return rows[0] as AgencyRow;
  }

  async update(agencyId: string, input: Partial<typeof agencies.$inferInsert>): Promise<AgencyRow | null> {
    const rows = await this.db
      .update(agencies)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(agencies.id, agencyId), isNull(agencies.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  async softDelete(agencyId: string): Promise<AgencyRow | null> {
    const rows = await this.db
      .update(agencies)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(agencies.id, agencyId), isNull(agencies.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }
}
