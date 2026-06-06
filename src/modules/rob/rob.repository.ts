import { and, count, desc, eq, gte, inArray, lte } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import {
  robCurrentStatus,
  robHistories,
  robManualOverrides,
  robWebhookLogs,
  settings,
  type NewRobCurrentStatusRow,
  type NewRobHistoryRow,
  type NewRobManualOverrideRow,
  type NewRobWebhookLogRow,
  type RobCurrentStatusRow,
  type RobHistoryRow,
} from '../../db/schema';

export type FindRobHistoriesInput = {
  page: number;
  limit: number;
  offset: number;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
};

export class RobRepository {
  constructor(private readonly db: DatabaseClient) {}

  async getCurrentStatus(): Promise<RobCurrentStatusRow | null> {
    const rows = await this.db.select().from(robCurrentStatus).orderBy(desc(robCurrentStatus.updatedAt)).limit(1);
    return rows[0] ?? null;
  }

  async upsertCurrentStatus(input: Omit<NewRobCurrentStatusRow, 'id'> & { id?: string | undefined }): Promise<RobCurrentStatusRow> {
    const existing = await this.getCurrentStatus();

    if (existing) {
      const rows = await this.db
        .update(robCurrentStatus)
        .set({
          status: input.status,
          score: input.score,
          waveHeight: input.waveHeight,
          tideHeight: input.tideHeight,
          rainfall: input.rainfall,
          source: input.source,
          recordedAt: input.recordedAt,
          updatedAt: new Date(),
        })
        .where(eq(robCurrentStatus.id, existing.id))
        .returning();

      return rows[0] as RobCurrentStatusRow;
    }

    const rows = await this.db.insert(robCurrentStatus).values(input).returning();
    return rows[0] as RobCurrentStatusRow;
  }

  async createHistory(input: NewRobHistoryRow): Promise<RobHistoryRow> {
    const rows = await this.db.insert(robHistories).values(input).returning();
    return rows[0] as RobHistoryRow;
  }

  async findHistories(input: FindRobHistoriesInput): Promise<{ items: RobHistoryRow[]; totalItems: number }> {
    const conditions = [];

    if (input.startDate) {
      conditions.push(gte(robHistories.recordedAt, input.startDate));
    }

    if (input.endDate) {
      conditions.push(lte(robHistories.recordedAt, input.endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const items = await this.db
      .select()
      .from(robHistories)
      .where(whereClause)
      .orderBy(desc(robHistories.recordedAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(robHistories).where(whereClause);

    return {
      items,
      totalItems: totalRows[0]?.count ?? 0,
    };
  }

  async createManualOverride(input: NewRobManualOverrideRow) {
    const rows = await this.db.insert(robManualOverrides).values(input).returning();
    return rows[0]!;
  }

  async getSettings(keys: string[]): Promise<Record<string, string>> {
    if (keys.length === 0) {
      return {};
    }

    const rows = await this.db.select().from(settings).where(inArray(settings.key, keys));

    return rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  async createWebhookLog(input: NewRobWebhookLogRow) {
    const rows = await this.db.insert(robWebhookLogs).values(input).returning();
    return rows[0]!;
  }
}
