import type { DatabaseClient } from '../../db/client';
import { agencyNotificationLogs, notificationLogs, type AgencyNotificationLogRow, type NotificationLogRow } from '../../db/schema';

export class AgencyNotificationLogRepository {
  constructor(private readonly db: DatabaseClient) {}

  async createAgencyNotificationLog(input: typeof agencyNotificationLogs.$inferInsert): Promise<AgencyNotificationLogRow> {
    const rows = await this.db.insert(agencyNotificationLogs).values(input).returning();
    return rows[0] as AgencyNotificationLogRow;
  }

  async createNotificationLog(input: typeof notificationLogs.$inferInsert): Promise<NotificationLogRow> {
    const rows = await this.db.insert(notificationLogs).values(input).returning();
    return rows[0] as NotificationLogRow;
  }
}
