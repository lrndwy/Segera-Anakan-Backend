import type { DatabaseClient } from '../../db/client';
import { NotFoundException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { AuditLogRepository } from './audit-log.repository';
import { sanitizeAuditData } from '../../lib/audit-log-sanitize';
import type { ExportAuditLogsQuery, ListAuditLogsQuery } from './audit-log.schema';
import type { AuditLogDetailResponse, AuditLogListItemResponse, AuditLogSummaryResponse } from './audit-log.types';

const toListItem = (row: { log: { id: string; action: string; module: string; entityType: string; entityId: string; userId: string | null; ipAddress: string; createdAt: Date }; userName: string | null }): AuditLogListItemResponse => ({
  id: row.log.id,
  action: row.log.action,
  module: row.log.module,
  entityType: row.log.entityType,
  entityId: row.log.entityId,
  userId: row.log.userId,
  userName: row.userName,
  ipAddress: row.log.ipAddress,
  createdAt: row.log.createdAt.toISOString(),
});

const sanitizeRecord = (data: unknown): Record<string, unknown> | null => {
  if (data === null || data === undefined) {
    return null;
  }

  const sanitized = sanitizeAuditData(data);
  return typeof sanitized === 'object' && sanitized !== null && !Array.isArray(sanitized)
    ? (sanitized as Record<string, unknown>)
    : null;
};

const escapeCsvValue = (value: string): string => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

export class AuditLogQueryService {
  private readonly auditLogRepository: AuditLogRepository;

  constructor(db: DatabaseClient) {
    this.auditLogRepository = new AuditLogRepository(db);
  }

  async findAll(query: ListAuditLogsQuery) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const { items, totalItems } = await this.auditLogRepository.findAll({
      ...query,
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
    });

    return {
      items: items.map(toListItem),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findById(auditLogId: string): Promise<AuditLogDetailResponse> {
    const record = await this.auditLogRepository.findById(auditLogId);

    if (!record) {
      throw new NotFoundException('Audit log not found');
    }

    return {
      id: record.log.id,
      action: record.log.action,
      module: record.log.module,
      entityType: record.log.entityType,
      entityId: record.log.entityId,
      user:
        record.userId && record.userFullName
          ? { id: record.userId, fullName: record.userFullName }
          : null,
      oldData: sanitizeRecord(record.log.oldData),
      newData: sanitizeRecord(record.log.newData),
      ipAddress: record.log.ipAddress,
      createdAt: record.log.createdAt.toISOString(),
    };
  }

  async summary(): Promise<AuditLogSummaryResponse> {
    return this.auditLogRepository.getSummary();
  }

  async exportCsv(query: ExportAuditLogsQuery): Promise<string> {
    const rows = await this.auditLogRepository.findAllForExport(query);
    const header = ['Timestamp', 'User', 'Action', 'Module', 'Entity Type', 'Entity ID', 'IP Address'].join(',');

    const lines = rows.map((row) =>
      [
        row.log.createdAt.toISOString(),
        row.userName ?? '',
        row.log.action,
        row.log.module,
        row.log.entityType,
        row.log.entityId,
        row.log.ipAddress,
      ]
        .map((value) => escapeCsvValue(String(value)))
        .join(','),
    );

    return [header, ...lines].join('\n');
  }
}
