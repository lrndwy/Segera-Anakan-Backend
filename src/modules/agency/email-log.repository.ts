import type { DatabaseClient } from '../../db/client';
import { emailLogs, type EmailLogRow } from '../../db/schema';

export class EmailLogRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: typeof emailLogs.$inferInsert): Promise<EmailLogRow> {
    const rows = await this.db.insert(emailLogs).values(input).returning();
    return rows[0] as EmailLogRow;
  }
}
