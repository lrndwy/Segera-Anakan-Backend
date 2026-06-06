import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { waterAlerts, waterAssets, type WaterAlertRow } from '../../db/schema';

export type FindWaterAlertsInput = {
  page: number;
  limit: number;
  offset: number;
  villageId?: string | undefined;
  assetIds?: string[] | undefined;
};

export class WaterAlertRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(alertId: string): Promise<WaterAlertRow | null> {
    const rows = await this.db.select().from(waterAlerts).where(eq(waterAlerts.id, alertId)).limit(1);
    return rows[0] ?? null;
  }

  async findByIdWithAsset(alertId: string) {
    const rows = await this.db
      .select({ alert: waterAlerts, asset: waterAssets })
      .from(waterAlerts)
      .innerJoin(waterAssets, eq(waterAlerts.waterAssetId, waterAssets.id))
      .where(eq(waterAlerts.id, alertId))
      .limit(1);

    return rows[0] ?? null;
  }

  async findAll(input: FindWaterAlertsInput): Promise<{ items: WaterAlertRow[]; totalItems: number }> {
    const conditions = [isNull(waterAssets.deletedAt)];

    if (input.assetIds && input.assetIds.length > 0) {
      conditions.push(inArray(waterAlerts.waterAssetId, input.assetIds));
    }

    if (input.villageId) {
      conditions.push(eq(waterAssets.villageId, input.villageId));
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select({ alert: waterAlerts })
      .from(waterAlerts)
      .innerJoin(waterAssets, eq(waterAlerts.waterAssetId, waterAssets.id))
      .where(whereClause)
      .orderBy(desc(waterAlerts.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db
      .select({ count: count() })
      .from(waterAlerts)
      .innerJoin(waterAssets, eq(waterAlerts.waterAssetId, waterAssets.id))
      .where(whereClause);

    return {
      items: items.map((row) => row.alert),
      totalItems: totalRows[0]?.count ?? 0,
    };
  }

  async create(input: typeof waterAlerts.$inferInsert): Promise<WaterAlertRow> {
    const rows = await this.db.insert(waterAlerts).values(input).returning();
    return rows[0] as WaterAlertRow;
  }

  async resolve(alertId: string, notes: string): Promise<WaterAlertRow | null> {
    const existing = await this.findById(alertId);

    if (!existing) {
      return null;
    }

    const rows = await this.db
      .update(waterAlerts)
      .set({
        resolved: true,
        resolvedAt: new Date(),
        message: `${existing.message}\n\nCatatan penyelesaian: ${notes}`,
      })
      .where(eq(waterAlerts.id, alertId))
      .returning();

    return rows[0] ?? null;
  }
}
