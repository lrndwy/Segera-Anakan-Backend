import { randomUUID } from 'crypto';

import { and, asc, eq, ilike, or, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { commodities, commodityCategories } from '../../db/schema';

export type CommodityCatalogItem = {
  id: string;
  name: string;
  categoryName: string;
};

export class CommodityRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findAllCatalog(search?: string): Promise<CommodityCatalogItem[]> {
    const conditions = [];

    if (search) {
      const keyword = `%${search}%`;
      conditions.push(or(ilike(commodities.name, keyword), ilike(commodityCategories.name, keyword))!);
    }

    const rows = await this.db
      .select({
        id: commodities.id,
        name: commodities.name,
        categoryName: commodityCategories.name,
      })
      .from(commodities)
      .innerJoin(commodityCategories, eq(commodities.categoryId, commodityCategories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(commodityCategories.name), asc(commodities.name));

    return rows;
  }

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

  async findCommodityByNameInsensitive(name: string) {
    const rows = await this.db
      .select()
      .from(commodities)
      .where(sql`lower(${commodities.name}) = lower(${name.trim()})`)
      .limit(1);

    return rows[0] ?? null;
  }

  async findOrCreateByName(name: string) {
    const existing = await this.findCommodityByNameInsensitive(name);

    if (existing) {
      return existing;
    }

    const defaultCategory = await this.db.select().from(commodityCategories).orderBy(asc(commodityCategories.name)).limit(1);
    const categoryId = defaultCategory[0]?.id;

    if (!categoryId) {
      throw new Error('No commodity category configured');
    }

    const rows = await this.db
      .insert(commodities)
      .values({
        id: randomUUID(),
        categoryId,
        name: name.trim(),
      })
      .returning();

    return rows[0] as NonNullable<(typeof rows)[0]>;
  }
}
