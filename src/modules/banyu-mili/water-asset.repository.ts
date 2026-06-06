import { and, count, desc, eq, gte, ilike, inArray, isNull, lte, or } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { villages, waterAssets, type WaterAssetRow } from '../../db/schema';

export type FindWaterAssetsInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
  villageId?: string | undefined;
  activeOnly?: boolean | undefined;
};

export class WaterAssetRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(assetId: string): Promise<WaterAssetRow | null> {
    const rows = await this.db
      .select()
      .from(waterAssets)
      .where(and(eq(waterAssets.id, assetId), isNull(waterAssets.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  }

  async findAll(input: FindWaterAssetsInput): Promise<{ items: WaterAssetRow[]; totalItems: number }> {
    const conditions = [isNull(waterAssets.deletedAt)];

    if (input.villageId) {
      conditions.push(eq(waterAssets.villageId, input.villageId));
    }

    if (input.activeOnly) {
      conditions.push(eq(waterAssets.isActive, true));
    }

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(or(ilike(waterAssets.name, keyword), ilike(waterAssets.locationName, keyword))!);
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select()
      .from(waterAssets)
      .where(whereClause)
      .orderBy(desc(waterAssets.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(waterAssets).where(whereClause);

    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async findPublicSummaries() {
    return this.db
      .select({
        id: waterAssets.id,
        name: waterAssets.name,
        locationName: waterAssets.locationName,
        capacityLiter: waterAssets.capacityLiter,
        villageId: waterAssets.villageId,
        villageName: villages.name,
      })
      .from(waterAssets)
      .innerJoin(villages, eq(waterAssets.villageId, villages.id))
      .where(and(isNull(waterAssets.deletedAt), eq(waterAssets.isActive, true), isNull(villages.deletedAt)))
      .orderBy(villages.name);
  }

  async create(input: typeof waterAssets.$inferInsert): Promise<WaterAssetRow> {
    const rows = await this.db.insert(waterAssets).values(input).returning();
    return rows[0] as WaterAssetRow;
  }

  async update(assetId: string, input: Partial<typeof waterAssets.$inferInsert>): Promise<WaterAssetRow | null> {
    const rows = await this.db
      .update(waterAssets)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(waterAssets.id, assetId), isNull(waterAssets.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  async softDelete(assetId: string): Promise<WaterAssetRow | null> {
    const rows = await this.db
      .update(waterAssets)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(waterAssets.id, assetId), isNull(waterAssets.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }
}
