import { and, eq, isNull } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { agencies, agencyNotificationLogs, notificationLogs, type AgencyRow } from '../../db/schema';

export class AgencyRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findActiveAgencies(): Promise<AgencyRow[]> {
    return this.db
      .select()
      .from(agencies)
      .where(and(eq(agencies.isActive, true), isNull(agencies.deletedAt)));
  }

  async createAgencyNotificationLog(input: typeof agencyNotificationLogs.$inferInsert) {
    const rows = await this.db.insert(agencyNotificationLogs).values(input).returning();
    return rows[0]!;
  }

  async createNotificationLog(input: typeof notificationLogs.$inferInsert) {
    const rows = await this.db.insert(notificationLogs).values(input).returning();
    return rows[0]!;
  }
}
