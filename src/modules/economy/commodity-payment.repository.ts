import { desc, eq } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { commodityPayments, type CommodityPaymentRow } from '../../db/schema';

export class CommodityPaymentRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findLatestByOrderId(orderId: string): Promise<CommodityPaymentRow | null> {
    const rows = await this.db
      .select()
      .from(commodityPayments)
      .where(eq(commodityPayments.commodityOrderId, orderId))
      .orderBy(desc(commodityPayments.createdAt))
      .limit(1);
    return rows[0] ?? null;
  }

  async create(input: typeof commodityPayments.$inferInsert): Promise<CommodityPaymentRow> {
    const rows = await this.db.insert(commodityPayments).values(input).returning();
    return rows[0] as CommodityPaymentRow;
  }

  async verifyPayment(paymentId: string, verifiedBy: string): Promise<CommodityPaymentRow | null> {
    const rows = await this.db
      .update(commodityPayments)
      .set({ paymentStatus: 'VERIFIED', verifiedBy, verifiedAt: new Date() })
      .where(eq(commodityPayments.id, paymentId))
      .returning();
    return rows[0] ?? null;
  }

  async rejectPayment(paymentId: string, verifiedBy: string, notes: string): Promise<CommodityPaymentRow | null> {
    const rows = await this.db
      .update(commodityPayments)
      .set({ paymentStatus: 'REJECTED', verifiedBy, verifiedAt: new Date(), notes })
      .where(eq(commodityPayments.id, paymentId))
      .returning();
    return rows[0] ?? null;
  }
}
