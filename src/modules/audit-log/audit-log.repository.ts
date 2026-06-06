import { SQL, and, asc, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { auditLogs, users, type AuditLogRow } from '../../db/schema';
import type { ListAuditLogsQuery } from './audit-log.schema';

export type FindAuditLogsInput = ListAuditLogsQuery & {
  page: number;
  limit: number;
  offset: number;
};

const buildConditions = (input: FindAuditLogsInput) => {
  const conditions: SQL[] = [];

  if (input.module) {
    conditions.push(eq(auditLogs.module, input.module));
  }

  if (input.action) {
    conditions.push(eq(auditLogs.action, input.action));
  }

  if (input.user_id) {
    conditions.push(eq(auditLogs.userId, input.user_id));
  }

  if (input.start_date) {
    conditions.push(gte(auditLogs.createdAt, new Date(`${input.start_date}T00:00:00.000Z`)));
  }

  if (input.end_date) {
    conditions.push(lte(auditLogs.createdAt, new Date(`${input.end_date}T23:59:59.999Z`)));
  }

  if (input.search) {
    const keyword = `%${input.search}%`;
    conditions.push(
      or(
        ilike(auditLogs.action, keyword),
        ilike(auditLogs.module, keyword),
        ilike(auditLogs.entityType, keyword),
        sql`${auditLogs.entityId}::text ilike ${keyword}`,
      )!,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
};

const resolveOrderBy = (input: FindAuditLogsInput) => {
  const sortOrder = input.sort_order === 'asc' ? asc : desc;

  switch (input.sort_by) {
    case 'action':
      return sortOrder(auditLogs.action);
    case 'module':
      return sortOrder(auditLogs.module);
    case 'entityType':
      return sortOrder(auditLogs.entityType);
    case 'createdAt':
    default:
      return sortOrder(auditLogs.createdAt);
  }
};

export class AuditLogRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findAll(input: FindAuditLogsInput) {
    const whereClause = buildConditions(input);

    const items = await this.db
      .select({
        log: auditLogs,
        userName: users.fullName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(resolveOrderBy(input))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(auditLogs).where(whereClause);

    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async findAllForExport(input: Omit<FindAuditLogsInput, 'page' | 'limit' | 'offset'>) {
    const whereClause = buildConditions(input as FindAuditLogsInput);

    return this.db
      .select({
        log: auditLogs,
        userName: users.fullName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(whereClause)
      .orderBy(resolveOrderBy(input as FindAuditLogsInput));
  }

  async findById(auditLogId: string) {
    const rows = await this.db
      .select({
        log: auditLogs,
        userId: users.id,
        userFullName: users.fullName,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.id, auditLogId))
      .limit(1);

    return rows[0] ?? null;
  }

  async getSummary() {
    const totalRows = await this.db.select({ count: count() }).from(auditLogs);
    const totalLogs = totalRows[0]?.count ?? 0;

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const todayRows = await this.db
      .select({ count: count() })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, startOfToday));

    const todayLogs = todayRows[0]?.count ?? 0;

    const topModules = await this.db
      .select({
        module: auditLogs.module,
        count: count(),
      })
      .from(auditLogs)
      .groupBy(auditLogs.module)
      .orderBy(desc(count()))
      .limit(5);

    const topActions = await this.db
      .select({
        action: auditLogs.action,
        count: count(),
      })
      .from(auditLogs)
      .groupBy(auditLogs.action)
      .orderBy(desc(count()))
      .limit(5);

    return {
      totalLogs,
      todayLogs,
      topModules: topModules.map((row) => ({ module: row.module, count: row.count })),
      topActions: topActions.map((row) => ({ action: row.action, count: row.count })),
    };
  }
}

export type AuditLogWithUser = {
  log: AuditLogRow;
  userName: string | null;
};
