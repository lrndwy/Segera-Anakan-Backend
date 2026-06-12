import { and, count, desc, eq, gte, inArray, isNull, lte, sum } from 'drizzle-orm';

import { WaterStatus } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { villages, waterAssets, waterReports, type WaterReportRow } from '../../db/schema';

export type FindWaterReportsInput = {
  page: number;
  limit: number;
  offset: number;
  villageId?: string | undefined;
  assetIds?: string[] | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
};

export class WaterReportRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(reportId: string): Promise<WaterReportRow | null> {
    const rows = await this.db.select().from(waterReports).where(eq(waterReports.id, reportId)).limit(1);
    return rows[0] ?? null;
  }

  async findByIdWithAsset(reportId: string) {
    const rows = await this.db
      .select({ report: waterReports, asset: waterAssets })
      .from(waterReports)
      .innerJoin(waterAssets, eq(waterReports.waterAssetId, waterAssets.id))
      .where(eq(waterReports.id, reportId))
      .limit(1);

    return rows[0] ?? null;
  }

  async findAll(input: FindWaterReportsInput): Promise<{ items: WaterReportRow[]; totalItems: number }> {
    const conditions = [isNull(waterAssets.deletedAt)];

    if (input.assetIds && input.assetIds.length > 0) {
      conditions.push(inArray(waterReports.waterAssetId, input.assetIds));
    }

    if (input.villageId) {
      conditions.push(eq(waterAssets.villageId, input.villageId));
    }

    if (input.startDate) {
      conditions.push(gte(waterReports.reportedAt, input.startDate));
    }

    if (input.endDate) {
      conditions.push(lte(waterReports.reportedAt, input.endDate));
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select({ report: waterReports })
      .from(waterReports)
      .innerJoin(waterAssets, eq(waterReports.waterAssetId, waterAssets.id))
      .where(whereClause)
      .orderBy(desc(waterReports.reportedAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db
      .select({ count: count() })
      .from(waterReports)
      .innerJoin(waterAssets, eq(waterReports.waterAssetId, waterAssets.id))
      .where(whereClause);

    return {
      items: items.map((row) => row.report),
      totalItems: totalRows[0]?.count ?? 0,
    };
  }

  async create(input: typeof waterReports.$inferInsert): Promise<WaterReportRow> {
    const rows = await this.db.insert(waterReports).values(input).returning();
    return rows[0] as WaterReportRow;
  }

  async update(reportId: string, input: Partial<typeof waterReports.$inferInsert>): Promise<WaterReportRow | null> {
    const rows = await this.db.update(waterReports).set(input).where(eq(waterReports.id, reportId)).returning();
    return rows[0] ?? null;
  }

  async getVillageWaterStatuses(): Promise<
    Array<{
      villageId: string;
      villageName: string;
      status: typeof WaterStatus[keyof typeof WaterStatus];
      lastUpdated: Date | null;
      percentRemaining: number | null;
      capacityTotalLiters: number;
      currentVolumeLiters: number;
    }>
  > {
    const villageRows = await this.db
      .select({ id: villages.id, name: villages.name })
      .from(villages)
      .where(isNull(villages.deletedAt));

    const capacityRows = await this.db
      .select({
        villageId: waterAssets.villageId,
        capacityTotalLiters: sum(waterAssets.capacityLiter),
      })
      .from(waterAssets)
      .where(and(isNull(waterAssets.deletedAt), eq(waterAssets.isActive, true)))
      .groupBy(waterAssets.villageId);

    const capacityByVillage = new Map(
      capacityRows.map((row) => [row.villageId, Number(row.capacityTotalLiters ?? 0)]),
    );

    const results = [];

    for (const village of villageRows) {
      const latestReport = await this.db
        .select({
          status: waterReports.status,
          reportedAt: waterReports.reportedAt,
          volumePercent: waterReports.volumePercent,
        })
        .from(waterReports)
        .innerJoin(waterAssets, eq(waterReports.waterAssetId, waterAssets.id))
        .where(and(eq(waterAssets.villageId, village.id), isNull(waterAssets.deletedAt)))
        .orderBy(desc(waterReports.reportedAt))
        .limit(1);

      const latest = latestReport[0];
      const capacityTotalLiters = capacityByVillage.get(village.id) ?? 0;
      const percentRemaining = latest?.volumePercent ?? null;
      const currentVolumeLiters =
        percentRemaining === null || capacityTotalLiters === 0
          ? 0
          : Math.round((capacityTotalLiters * percentRemaining) / 100);

      results.push({
        villageId: village.id,
        villageName: village.name,
        status: latest?.status ?? WaterStatus.AMAN,
        lastUpdated: latest?.reportedAt ?? null,
        percentRemaining,
        capacityTotalLiters,
        currentVolumeLiters,
      });
    }

    return results;
  }
}
