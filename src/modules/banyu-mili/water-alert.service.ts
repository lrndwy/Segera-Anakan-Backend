import { UserRole, type WaterStatus } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { NotFoundException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import type { ListWaterAlertsQuery, ResolveWaterAlertInput } from './water.schema';
import { WaterAlertRepository } from './water-alert.repository';
import type { BanyuMiliServiceMeta, WaterAlertResponse } from './water.types';

const toAlertResponse = (alert: {
  id: string;
  waterAssetId: string;
  status: string;
  message: string;
  resolved: boolean;
  resolvedAt: Date | null;
  createdAt: Date;
}): WaterAlertResponse => ({
  id: alert.id,
  waterAssetId: alert.waterAssetId,
  status: alert.status as WaterAlertResponse['status'],
  message: alert.message,
  resolved: alert.resolved,
  resolvedAt: alert.resolvedAt?.toISOString() ?? null,
  createdAt: alert.createdAt.toISOString(),
});

export class WaterAlertService {
  private readonly waterAlertRepository: WaterAlertRepository;

  constructor(
    db: DatabaseClient,
    private readonly auditLogService: AuditLogService,
  ) {
    this.waterAlertRepository = new WaterAlertRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return undefined;
    }

    return currentUser.villageId ?? undefined;
  }

  async findAll(query: ListWaterAlertsQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return {
        items: [] as WaterAlertResponse[],
        meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }),
      };
    }

    const { items, totalItems } = await this.waterAlertRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      villageId: villageScope,
    });

    return {
      items: items.map(toAlertResponse),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async createCriticalAlert(input: { waterAssetId: string; status: WaterStatus; message: string }) {
    return this.waterAlertRepository.create({
      waterAssetId: input.waterAssetId,
      status: input.status,
      message: input.message,
    });
  }

  async resolve(alertId: string, input: ResolveWaterAlertInput, meta: BanyuMiliServiceMeta): Promise<void> {
    const record = await this.waterAlertRepository.findByIdWithAsset(alertId);

    if (!record) {
      throw new NotFoundException('Water alert not found');
    }

    const resolved = await this.waterAlertRepository.resolve(alertId, input.notes);

    if (!resolved) {
      throw new NotFoundException('Water alert not found');
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'RESOLVE_WATER_ALERT',
      module: 'BANYU_MILI',
      entityType: 'water_alerts',
      entityId: alertId,
      ipAddress: meta.ipAddress,
      newData: toAlertResponse(resolved),
    });
  }
}
