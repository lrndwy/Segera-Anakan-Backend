import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { commodities, commodityCategories } from '../../db/schema';

export class CommodityRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findCommodityById(commodityId: string) {
    const rows = await this.db.select().from(commodities).where(eq(commodities.id, commodityId)).limit(1);
    return rows[0] ?? null;
  }

  async findCommodityWithCategory(commodityId: string) {
    const rows = await this.db
      .select({ commodity: commodities, categoryName: commodityCategories.name })
      .from(commodities)
      .innerJoin(commodityCategories, eq(commodities.categoryId, commodityCategories.id))
      .where(eq(commodities.id, commodityId))
      .limit(1);
    return rows[0] ?? null;
  }
}
