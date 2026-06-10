import { and, count, desc, eq, gt, ilike, isNull, or } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import {
  commodities,
  commodityInventory,
  commodityStockMovements,
  files,
  fishermen,
  villages,
  type CommodityInventoryRow,
  type CommodityStockMovementRow,
} from '../../db/schema';

export type FindInventoryInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
  commodityId?: string | undefined;
  villageId?: string | undefined;
  publicOnly?: boolean | undefined;
};

export class CommodityInventoryRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(inventoryId: string): Promise<CommodityInventoryRow | null> {
    const rows = await this.db.select().from(commodityInventory).where(eq(commodityInventory.id, inventoryId)).limit(1);
    return rows[0] ?? null;
  }

  async findByIdWithDetails(inventoryId: string) {
    const rows = await this.db
      .select({
        inventory: commodityInventory,
        fishermanName: fishermen.fullName,
        commodityName: commodities.name,
        villageId: fishermen.villageId,
        villageName: villages.name,
        imageUrl: files.url,
      })
      .from(commodityInventory)
      .innerJoin(fishermen, eq(commodityInventory.fishermanId, fishermen.id))
      .innerJoin(commodities, eq(commodityInventory.commodityId, commodities.id))
      .innerJoin(villages, eq(fishermen.villageId, villages.id))
      .leftJoin(files, eq(commodityInventory.fileId, files.id))
      .where(eq(commodityInventory.id, inventoryId))
      .limit(1);
    return rows[0] ?? null;
  }

  async findAll(input: FindInventoryInput) {
    const conditions = [eq(fishermen.isActive, true), isNull(fishermen.deletedAt)];

    if (input.publicOnly) {
      conditions.push(gt(commodityInventory.availableWeightKg, '0'));
    }

    if (input.commodityId) conditions.push(eq(commodityInventory.commodityId, input.commodityId));
    if (input.villageId) conditions.push(eq(fishermen.villageId, input.villageId));

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(or(ilike(commodities.name, keyword), ilike(fishermen.fullName, keyword))!);
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select({
        inventory: commodityInventory,
        fishermanName: fishermen.fullName,
        commodityName: commodities.name,
        villageId: fishermen.villageId,
        villageName: villages.name,
        imageUrl: files.url,
      })
      .from(commodityInventory)
      .innerJoin(fishermen, eq(commodityInventory.fishermanId, fishermen.id))
      .innerJoin(commodities, eq(commodityInventory.commodityId, commodities.id))
      .innerJoin(villages, eq(fishermen.villageId, villages.id))
      .leftJoin(files, eq(commodityInventory.fileId, files.id))
      .where(whereClause)
      .orderBy(desc(commodityInventory.updatedAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db
      .select({ count: count() })
      .from(commodityInventory)
      .innerJoin(fishermen, eq(commodityInventory.fishermanId, fishermen.id))
      .innerJoin(commodities, eq(commodityInventory.commodityId, commodities.id))
      .where(whereClause);

    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async create(input: typeof commodityInventory.$inferInsert): Promise<CommodityInventoryRow> {
    const rows = await this.db.insert(commodityInventory).values(input).returning();
    return rows[0] as CommodityInventoryRow;
  }

  async update(inventoryId: string, input: Partial<typeof commodityInventory.$inferInsert>): Promise<CommodityInventoryRow | null> {
    const rows = await this.db
      .update(commodityInventory)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(commodityInventory.id, inventoryId))
      .returning();
    return rows[0] ?? null;
  }

  async createStockMovement(input: typeof commodityStockMovements.$inferInsert): Promise<CommodityStockMovementRow> {
    const rows = await this.db.insert(commodityStockMovements).values(input).returning();
    return rows[0] as CommodityStockMovementRow;
  }

  async findStockMovements(inventoryId: string, limit = 50): Promise<CommodityStockMovementRow[]> {
    return this.db
      .select()
      .from(commodityStockMovements)
      .where(eq(commodityStockMovements.inventoryId, inventoryId))
      .orderBy(desc(commodityStockMovements.createdAt))
      .limit(limit);
  }
}
