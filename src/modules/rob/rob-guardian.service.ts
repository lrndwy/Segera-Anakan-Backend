import { randomUUID } from 'crypto';

import { RobStatus } from '../../constants';
import type { Database } from '../../db/client';
import { NotFoundException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { runTransaction } from '../../lib/transaction';
import type { AuditLogService } from '../../services/audit-log.service';
import type { SettingsService } from '../settings/settings.service';
import { VillageRepository } from '../village/village.repository';
import { BmkgService } from './bmkg.service';
import type { ListRobHistoriesQuery, ManualOverrideInput, VillageAlertInput } from './rob.schema';
import { evaluateRobMetrics, scoreFromManualStatus, toNumber, type RobThresholds } from './rob-score';
import { RobRepository } from './rob.repository';
import type {
  RobHistoryItemResponse,
  RobServiceMeta,
  RobStatusResponse,
  RobVillagesStatusResponse,
} from './rob.types';
import { WebhookService } from './webhook.service';

const requireNumber = async (settingsService: SettingsService, key: string): Promise<number> => {
  const value = await settingsService.getNumber(key);
  if (value === null) {
    throw new NotFoundException(`Setting ${key} is not configured`);
  }
  return value;
};

const toStatusResponse = (row: {
  status: RobStatus;
  score: number;
  waveHeight: string | number;
  tideHeight: string | number;
  rainfall: string | number;
  recordedAt: Date;
}): RobStatusResponse => ({
  status: row.status,
  score: row.score,
  waveHeight: toNumber(row.waveHeight),
  tideHeight: toNumber(row.tideHeight),
  rainfall: toNumber(row.rainfall),
  recordedAt: row.recordedAt.toISOString(),
});

const toHistoryItem = (row: {
  id: string;
  status: RobStatus;
  score: number;
  waveHeight: string | number;
  tideHeight: string | number;
  rainfall: string | number;
  notes: string | null;
  recordedAt: Date;
}): RobHistoryItemResponse => ({
  id: row.id,
  status: row.status,
  score: row.score,
  waveHeight: toNumber(row.waveHeight),
  tideHeight: toNumber(row.tideHeight),
  rainfall: toNumber(row.rainfall),
  notes: row.notes,
  recordedAt: row.recordedAt.toISOString(),
});

const formatVillageName = (name: string): string => {
  const trimmed = name.trim();
  return trimmed.toLowerCase().startsWith('desa ') ? trimmed : `Desa ${trimmed}`;
};

export class RobGuardianService {
  private readonly robRepository: RobRepository;
  private readonly webhookService: WebhookService;
  private readonly bmkgService: BmkgService;
  private readonly villageRepository: VillageRepository;

  constructor(
    private readonly db: Database,
    private readonly auditLogService: AuditLogService,
    private readonly settingsService: SettingsService,
  ) {
    this.robRepository = new RobRepository(db);
    this.webhookService = new WebhookService(this.robRepository, settingsService);
    this.villageRepository = new VillageRepository(db);
    this.bmkgService = new BmkgService(settingsService, this.villageRepository);
  }

  private async getThresholds(): Promise<RobThresholds> {
    return {
      waveWarning: await requireNumber(this.settingsService, 'ROB_WAVE_WARNING'),
      waveDanger: await requireNumber(this.settingsService, 'ROB_WAVE_DANGER'),
      tideWarning: await requireNumber(this.settingsService, 'ROB_TIDE_WARNING'),
      tideDanger: await requireNumber(this.settingsService, 'ROB_TIDE_DANGER'),
      rainWarning: await requireNumber(this.settingsService, 'ROB_RAIN_WARNING'),
      rainDanger: await requireNumber(this.settingsService, 'ROB_RAIN_DANGER'),
    };
  }

  async getCurrentStatus(): Promise<RobStatusResponse> {
    const current = await this.robRepository.getCurrentStatus();

    if (!current) {
      throw new NotFoundException('Current rob status not found');
    }

    return toStatusResponse(current);
  }

  async getVillageStatuses(): Promise<RobVillagesStatusResponse> {
    const current = await this.robRepository.getCurrentStatus();

    if (!current) {
      throw new NotFoundException('Current rob status not found');
    }

    const thresholds = await this.getThresholds();
    const villages = await this.villageRepository.findAllWithBmkgRegion();

    const villageStatuses = await Promise.all(
      villages.map(async (village) => {
        const metrics = await this.bmkgService.fetchMetricsForRegion(village.bmkgRegionCode);
        const evaluation = evaluateRobMetrics(metrics, thresholds);

        return {
          villageId: village.id,
          villageName: formatVillageName(village.name),
          status: evaluation.status,
          waterLevel: Number(evaluation.waveHeight.toFixed(2)),
        };
      }),
    );

    return {
      status: current.status,
      score: current.score,
      waveHeight: toNumber(current.waveHeight),
      villages: villageStatuses,
    };
  }

  async getHistories(query: ListRobHistoriesQuery) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });

    const startDate = query.start_date ? new Date(`${query.start_date}T00:00:00.000Z`) : undefined;
    const endDate = query.end_date ? new Date(`${query.end_date}T23:59:59.999Z`) : undefined;

    const { items, totalItems } = await this.robRepository.findHistories({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      startDate,
      endDate,
    });

    return {
      items: items.map(toHistoryItem),
      meta: buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
      }),
    };
  }

  async runSyncCycle(): Promise<void> {
    const thresholds = await this.getThresholds();
    const metrics = await this.bmkgService.fetchMetrics();
    const evaluation = evaluateRobMetrics(metrics, thresholds);
    const previous = await this.robRepository.getCurrentStatus();
    const recordedAt = new Date();

    await this.robRepository.createHistory({
      status: evaluation.status,
      score: evaluation.score,
      waveHeight: evaluation.waveHeight.toString(),
      tideHeight: evaluation.tideHeight.toString(),
      rainfall: evaluation.rainfall.toString(),
      recordedAt,
      notes: 'BMKG sync',
    });

    await this.robRepository.upsertCurrentStatus({
      status: evaluation.status,
      score: evaluation.score,
      waveHeight: evaluation.waveHeight.toString(),
      tideHeight: evaluation.tideHeight.toString(),
      rainfall: evaluation.rainfall.toString(),
      source: 'BMKG',
      recordedAt,
    });

    if (!previous || previous.status !== evaluation.status) {
      await this.webhookService.sendStatusChanged(evaluation.status, evaluation.score);
    }
  }

  async manualOverride(input: ManualOverrideInput, userId: string, meta: RobServiceMeta): Promise<void> {
    const current = await this.robRepository.getCurrentStatus();
    const score = scoreFromManualStatus(input.status);
    const recordedAt = new Date();
    const shouldNotify = !current || current.status !== input.status;

    await runTransaction(this.db, async (tx) => {
      const robRepository = new RobRepository(tx);

      const override = await robRepository.createManualOverride({
        status: input.status,
        reason: input.reason,
        createdBy: userId,
      });

      await robRepository.upsertCurrentStatus({
        status: input.status,
        score,
        waveHeight: current ? current.waveHeight : '0',
        tideHeight: current ? current.tideHeight : '0',
        rainfall: current ? current.rainfall : '0',
        source: 'MANUAL_OVERRIDE',
        recordedAt,
      });

      await robRepository.createHistory({
        status: input.status,
        score,
        waveHeight: current ? current.waveHeight : '0',
        tideHeight: current ? current.tideHeight : '0',
        rainfall: current ? current.rainfall : '0',
        recordedAt,
        notes: input.reason,
      });

      await this.auditLogService.create(
        {
          userId: meta.actorUserId,
          action: 'ROB_OVERRIDE',
          module: 'ROB_GUARDIAN',
          entityType: 'rob_manual_overrides',
          entityId: override.id,
          ipAddress: meta.ipAddress,
          newData: {
            status: input.status,
            reason: input.reason,
          },
        },
        tx,
      );
    });

    if (shouldNotify) {
      await this.webhookService.sendStatusChanged(input.status, score);
    }
  }

  async testWebhook(meta: RobServiceMeta): Promise<void> {
    const current = await this.robRepository.getCurrentStatus();
    const status = current?.status ?? RobStatus.AMAN;
    const score = current?.score ?? 0;

    await this.webhookService.sendTest(status, score);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'ROB_WEBHOOK_TEST',
      module: 'ROB_GUARDIAN',
      entityType: 'rob_webhook_logs',
      entityId: randomUUID(),
      ipAddress: meta.ipAddress,
    });
  }

  async sendVillageAlert(input: VillageAlertInput, meta: RobServiceMeta): Promise<void> {
    const villageRepository = new VillageRepository(this.db);
    const village = await villageRepository.findById(input.villageId);

    if (!village) {
      throw new NotFoundException('Village not found');
    }

    const webhookLog = await this.webhookService.sendVillageAlert({
      villageId: input.villageId,
      message: input.message,
      severityLevel: input.severityLevel,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'SEND_VILLAGE_ALERT',
      module: 'ROB_GUARDIAN',
      entityType: 'rob_webhook_logs',
      entityId: webhookLog.id,
      ipAddress: meta.ipAddress,
      newData: {
        villageId: input.villageId,
        message: input.message,
        severityLevel: input.severityLevel,
      },
    });
  }
}
