import { UserRole, WaterStatus, type WaterCondition } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { ForbiddenException, NotFoundException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import type { AuditLogService } from '../../services/audit-log.service';
import type { EmailService } from '../../services/email.service';
import type { CurrentUser } from '../../types/current-user';
import { VillageRepository } from '../village/village.repository';
import type { SettingsService } from '../settings/settings.service';
import { getWaterThresholds } from './water-thresholds';
import { calculateEstimatedDaysLeft, calculateWaterStatus } from './water-status.calculator';
import type { CreateWaterReportInput, ListWaterReportsQuery, UpdateWaterReportInput } from './water.schema';
import { WaterAlertService } from './water-alert.service';
import { WaterAssetRepository } from './water-asset.repository';
import { WaterNotificationService } from './water-notification.service';
import { WaterReportRepository } from './water-report.repository';
import type { BanyuMiliServiceMeta, VillageWaterStatusResponse, WaterReportResponse } from './water.types';

const toReportResponse = (report: {
  id: string;
  waterAssetId: string;
  submittedBy: string;
  volumePercent: number;
  waterCondition: WaterCondition;
  estimatedDaysLeft: number;
  status: WaterReportResponse['status'];
  notes: string | null;
  reportedAt: Date;
}): WaterReportResponse => ({
  id: report.id,
  waterAssetId: report.waterAssetId,
  submittedBy: report.submittedBy,
  volumePercent: report.volumePercent,
  waterCondition: report.waterCondition,
  estimatedDaysLeft: report.estimatedDaysLeft,
  status: report.status,
  notes: report.notes,
  reportedAt: report.reportedAt.toISOString(),
});

export class WaterReportService {
  private readonly waterReportRepository: WaterReportRepository;
  private readonly waterAssetRepository: WaterAssetRepository;
  private readonly settingsService: SettingsService;
  private readonly villageRepository: VillageRepository;
  private readonly waterAlertService: WaterAlertService;
  private readonly waterNotificationService: WaterNotificationService;

  constructor(db: DatabaseClient, auditLogService: AuditLogService, emailService: EmailService, settingsService: SettingsService) {
    this.waterReportRepository = new WaterReportRepository(db);
    this.waterAssetRepository = new WaterAssetRepository(db);
    this.settingsService = settingsService;
    this.villageRepository = new VillageRepository(db);
    this.waterAlertService = new WaterAlertService(db, auditLogService);
    this.waterNotificationService = new WaterNotificationService(db, emailService, settingsService);
    this.auditLogService = auditLogService;
  }

  private readonly auditLogService: AuditLogService;

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return undefined;
    }

    return currentUser.villageId ?? undefined;
  }

  async getPublicWaterStatus(): Promise<VillageWaterStatusResponse[]> {
    const statuses = await this.waterReportRepository.getVillageWaterStatuses();

    return statuses.map((item) => ({
      villageId: item.villageId,
      villageName: item.villageName,
      status: item.status,
      lastUpdated: item.lastUpdated?.toISOString() ?? '',
    }));
  }

  async findAll(query: ListWaterReportsQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);
    const startDate = query.start_date ? new Date(`${query.start_date}T00:00:00.000Z`) : undefined;
    const endDate = query.end_date ? new Date(`${query.end_date}T23:59:59.999Z`) : undefined;

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return {
        items: [] as WaterReportResponse[],
        meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }),
      };
    }

    const { items, totalItems } = await this.waterReportRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      villageId: villageScope,
      startDate,
      endDate,
    });

    return {
      items: items.map(toReportResponse),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async create(input: CreateWaterReportInput, currentUser: CurrentUser, meta: BanyuMiliServiceMeta): Promise<WaterReportResponse> {
    const asset = await this.waterAssetRepository.findById(input.waterAssetId);

    if (!asset) {
      throw new NotFoundException('Water asset not found');
    }

    assertVillageAccess(currentUser, asset.villageId);

    if (currentUser.role !== UserRole.KADER_DESA) {
      throw new ForbiddenException();
    }

    const thresholds = await getWaterThresholds(this.settingsService);
    const status = calculateWaterStatus(input.volumePercent, thresholds);
    const estimatedDaysLeft = calculateEstimatedDaysLeft(input.volumePercent, thresholds.dailyDropPercent);

    const report = await this.waterReportRepository.create({
      waterAssetId: input.waterAssetId,
      submittedBy: currentUser.id,
      volumePercent: input.volumePercent,
      waterCondition: input.waterCondition,
      estimatedDaysLeft,
      status,
      notes: input.notes ?? null,
      reportedAt: new Date(),
    });

    if (status === WaterStatus.KRITIS) {
      const village = await this.villageRepository.findById(asset.villageId);

      await this.waterAlertService.createCriticalAlert({
        waterAssetId: asset.id,
        status,
        message: `Status air KRITIS (${input.volumePercent}%) pada ${asset.name}`,
      });

      await this.waterNotificationService.notifyCriticalAlert({
        villageId: asset.villageId,
        villageName: village?.name ?? 'Desa',
        assetName: asset.name,
        status,
        volumePercent: input.volumePercent,
        actorUserId: currentUser.id,
      });
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_WATER_REPORT',
      module: 'BANYU_MILI',
      entityType: 'water_reports',
      entityId: report.id,
      ipAddress: meta.ipAddress,
      newData: toReportResponse(report),
    });

    return toReportResponse(report);
  }

  async update(reportId: string, input: UpdateWaterReportInput, currentUser: CurrentUser, _meta: BanyuMiliServiceMeta): Promise<WaterReportResponse> {
    const record = await this.waterReportRepository.findByIdWithAsset(reportId);

    if (!record) {
      throw new NotFoundException('Water report not found');
    }

    if (currentUser.role !== UserRole.KADER_DESA || record.report.submittedBy !== currentUser.id) {
      throw new ForbiddenException();
    }

    assertVillageAccess(currentUser, record.asset.villageId);

    const thresholds = await getWaterThresholds(this.settingsService);
    const volumePercent = input.volumePercent ?? record.report.volumePercent;
    const status = calculateWaterStatus(volumePercent, thresholds);
    const estimatedDaysLeft = calculateEstimatedDaysLeft(volumePercent, thresholds.dailyDropPercent);

    const updated = await this.waterReportRepository.update(reportId, {
      ...(input.volumePercent !== undefined ? { volumePercent: input.volumePercent } : {}),
      ...(input.waterCondition !== undefined ? { waterCondition: input.waterCondition } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      status,
      estimatedDaysLeft,
    });

    if (!updated) {
      throw new NotFoundException('Water report not found');
    }

    return toReportResponse(updated);
  }
}
