import { and, count, desc, eq, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { commodityOrders, manifestItems, manifests, type ManifestRow } from '../../db/schema';

export type FindManifestsInput = {
  page: number;
  limit: number;
  offset: number;
  villageId?: string | undefined;
};

export class ManifestRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(manifestId: string): Promise<ManifestRow | null> {
    const rows = await this.db.select().from(manifests).where(eq(manifests.id, manifestId)).limit(1);
    return rows[0] ?? null;
  }

  async findAll(input: FindManifestsInput) {
    const conditions = input.villageId ? [eq(manifests.villageId, input.villageId)] : [];
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db
      .select({
        manifest: manifests,
        itemCount: sql<number>`(
          select count(*)::int from manifest_items
          where manifest_items.manifest_id = ${manifests.id}
        )`,
      })
      .from(manifests)
      .where(whereClause)
      .orderBy(desc(manifests.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(manifests).where(whereClause);
    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async findDetail(manifestId: string) {
    const manifest = await this.findById(manifestId);
    if (!manifest) return null;

    const items = await this.db
      .select({
        item: manifestItems,
        invoiceNumber: commodityOrders.invoiceNumber,
        buyerName: commodityOrders.buyerName,
      })
      .from(manifestItems)
      .innerJoin(commodityOrders, eq(manifestItems.commodityOrderId, commodityOrders.id))
      .where(eq(manifestItems.manifestId, manifestId));

    return { manifest, items };
  }

  async create(input: typeof manifests.$inferInsert): Promise<ManifestRow> {
    const rows = await this.db.insert(manifests).values(input).returning();
    return rows[0] as ManifestRow;
  }

  async update(manifestId: string, input: Partial<typeof manifests.$inferInsert>): Promise<ManifestRow | null> {
    const rows = await this.db
      .update(manifests)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(manifests.id, manifestId))
      .returning();
    return rows[0] ?? null;
  }

  async isOrderInManifest(commodityOrderId: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: manifestItems.id })
      .from(manifestItems)
      .where(eq(manifestItems.commodityOrderId, commodityOrderId))
      .limit(1);
    return rows.length > 0;
  }

  async addItem(input: typeof manifestItems.$inferInsert) {
    const rows = await this.db.insert(manifestItems).values(input).returning();
    return rows[0]!;
  }
}
