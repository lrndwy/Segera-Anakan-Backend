import { and, count, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { files, villages, type VillageRow } from '../../db/schema';

export type FindAllVillagesInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
  villageId?: string | undefined;
};

export type VillageWithQris = VillageRow & {
  qrisFileIdValue: string | null;
  qrisUrl: string | null;
};

export class VillageRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(villageId: string): Promise<VillageRow | null> {
    const rows = await this.db
      .select()
      .from(villages)
      .where(and(eq(villages.id, villageId), isNull(villages.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  }

  async findByIdWithQris(villageId: string): Promise<VillageWithQris | null> {
    const rows = await this.db
      .select({
        village: villages,
        qrisFileIdValue: files.id,
        qrisUrl: files.url,
      })
      .from(villages)
      .leftJoin(files, eq(villages.qrisFileId, files.id))
      .where(and(eq(villages.id, villageId), isNull(villages.deletedAt)))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      ...row.village,
      qrisFileIdValue: row.qrisFileIdValue,
      qrisUrl: row.qrisUrl,
    };
  }

  async findAll(input: FindAllVillagesInput): Promise<{ items: VillageRow[]; totalItems: number }> {
    const conditions = [isNull(villages.deletedAt)];

    if (input.villageId) {
      conditions.push(eq(villages.id, input.villageId));
    }

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(
        or(
          ilike(villages.name, keyword),
          ilike(villages.contactName, keyword),
          ilike(villages.contactEmail, keyword),
          ilike(villages.contactPhone, keyword),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select()
      .from(villages)
      .where(whereClause)
      .orderBy(sql`${villages.name} asc`)
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(villages).where(whereClause);

    return {
      items,
      totalItems: totalRows[0]?.count ?? 0,
    };
  }

  async findAllBmkgRegionCodes(): Promise<string[]> {
    const rows = await this.db
      .select({ code: villages.bmkgRegionCode })
      .from(villages)
      .where(and(isNull(villages.deletedAt), sql`${villages.bmkgRegionCode} is not null`));

    return rows.map((row) => row.code).filter((code): code is string => Boolean(code));
  }

  async update(villageId: string, input: Partial<typeof villages.$inferInsert>): Promise<VillageRow | null> {
    const rows = await this.db
      .update(villages)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(villages.id, villageId), isNull(villages.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  async updateQris(villageId: string, fileId: string): Promise<VillageRow | null> {
    const rows = await this.db
      .update(villages)
      .set({ qrisFileId: fileId, updatedAt: new Date() })
      .where(and(eq(villages.id, villageId), isNull(villages.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }
}
