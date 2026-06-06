import { and, count, desc, eq, ilike } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import {
  commodityOrderItems,
  commodityOrders,
  type CommodityOrderItemRow,
  type CommodityOrderRow,
} from '../../db/schema';

export type FindCommodityOrdersInput = {
  page: number;
  limit: number;
  offset: number;
  villageId?: string | undefined;
  status?: string | undefined;
};

export class CommodityOrderRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(orderId: string): Promise<CommodityOrderRow | null> {
    const rows = await this.db.select().from(commodityOrders).where(eq(commodityOrders.id, orderId)).limit(1);
    return rows[0] ?? null;
  }

  async findAll(input: FindCommodityOrdersInput) {
    const conditions = [];
    if (input.villageId) conditions.push(eq(commodityOrders.villageId, input.villageId));
    if (input.status) conditions.push(eq(commodityOrders.status, input.status as CommodityOrderRow['status']));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db
      .select()
      .from(commodityOrders)
      .where(whereClause)
      .orderBy(desc(commodityOrders.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(commodityOrders).where(whereClause);
    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async countByInvoiceDatePrefix(datePrefix: string): Promise<number> {
    const rows = await this.db
      .select({ count: count() })
      .from(commodityOrders)
      .where(ilike(commodityOrders.invoiceNumber, `INV-${datePrefix}-%`));
    return rows[0]?.count ?? 0;
  }

  async create(input: typeof commodityOrders.$inferInsert): Promise<CommodityOrderRow> {
    const rows = await this.db.insert(commodityOrders).values(input).returning();
    return rows[0] as CommodityOrderRow;
  }

  async updateStatus(orderId: string, status: CommodityOrderRow['status']): Promise<CommodityOrderRow | null> {
    const rows = await this.db
      .update(commodityOrders)
      .set({ status, updatedAt: new Date() })
      .where(eq(commodityOrders.id, orderId))
      .returning();
    return rows[0] ?? null;
  }

  async createItems(items: (typeof commodityOrderItems.$inferInsert)[]): Promise<CommodityOrderItemRow[]> {
    if (items.length === 0) return [];
    return this.db.insert(commodityOrderItems).values(items).returning();
  }

  async findItemsByOrderId(orderId: string): Promise<CommodityOrderItemRow[]> {
    return this.db.select().from(commodityOrderItems).where(eq(commodityOrderItems.commodityOrderId, orderId));
  }
}
