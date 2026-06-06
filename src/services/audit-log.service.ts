import type { DatabaseClient } from '../db/client';
import { auditLogs, type AuditLogRow, type NewAuditLogRow } from '../db/schema';
import { sanitizeAuditData } from '../lib/audit-log-sanitize';

export type CreateAuditLogInput = {
  userId?: string | null | undefined;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  oldData?: Record<string, unknown> | null | undefined;
  newData?: Record<string, unknown> | null | undefined;
  ipAddress: string;
};

export class AuditLogService {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: CreateAuditLogInput, db: DatabaseClient = this.db): Promise<AuditLogRow> {
    const values: NewAuditLogRow = {
      action: input.action,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      ipAddress: input.ipAddress,
      userId: input.userId ?? null,
      oldData: (sanitizeAuditData(input.oldData ?? null) as Record<string, unknown> | null) ?? null,
      newData: (sanitizeAuditData(input.newData ?? null) as Record<string, unknown> | null) ?? null,
    };

    const rows = await db.insert(auditLogs).values(values).returning();
    return rows[0] as AuditLogRow;
  }
}
