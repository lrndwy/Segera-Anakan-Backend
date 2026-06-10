import type { OpenAPIHono } from '@hono/zod-openapi';
import type Redis from 'ioredis';
import type { Pool } from 'pg';

import { createApp } from '../../src/app';
import { createRedisClient } from '../../src/config';
import { createDatabase, type Database, type DatabaseClient } from '../../src/db/client';
import { S3StorageProvider } from '../../src/modules/storage/providers/s3.provider';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UserManagementService } from '../../src/modules/user/user-management.service';
import { FileService } from '../../src/modules/file/file.service';
import { VillageService } from '../../src/modules/village/village.service';
import { RobGuardianService } from '../../src/modules/rob/rob-guardian.service';
import { WaterAlertService } from '../../src/modules/banyu-mili/water-alert.service';
import { WaterAssetService } from '../../src/modules/banyu-mili/water-asset.service';
import { WaterReportService } from '../../src/modules/banyu-mili/water-report.service';
import { BoatOwnerService } from '../../src/modules/tourism/boat-owner.service';
import { BookingService } from '../../src/modules/tourism/booking.service';
import { DestinationService } from '../../src/modules/tourism/destination.service';
import { CommodityService } from '../../src/modules/economy/commodity.service';
import { DashboardService } from '../../src/modules/dashboard/dashboard.service';
import { FishermanService } from '../../src/modules/economy/fisherman.service';
import { ReportsService } from '../../src/modules/reports/reports.service';
import { WeatherService } from '../../src/modules/weather/weather.service';
import { VillageRepository } from '../../src/modules/village/village.repository';
import { CommodityInventoryService } from '../../src/modules/economy/commodity-inventory.service';
import { CommodityOrderService } from '../../src/modules/economy/commodity-order.service';
import { CommodityPaymentService } from '../../src/modules/economy/commodity-payment.service';
import { ManifestService } from '../../src/modules/economy/manifest.service';
import { AgencyService } from '../../src/modules/agency/agency.service';
import { SettingsService } from '../../src/modules/settings/settings.service';
import { AuditLogQueryService } from '../../src/modules/audit-log/audit-log.service';
import { EmailQueueService } from '../../src/modules/job/queues/email.queue';
import { AuditLogService } from '../../src/services/audit-log.service';
import { EmailService } from '../../src/services/email.service';
import { MinioService } from '../../src/services/minio.service';
import { logger } from '../../src/config/logger';
import type { AppEnv } from '../../src/types/app-env';

export type TestAppContext = {
  app: OpenAPIHono<AppEnv>;
  pool: Pool;
  db: Database;
  redis: Redis;
  auditLogService: AuditLogService;
  robGuardianService: RobGuardianService;
  bookingService: BookingService;
  settingsService: SettingsService;
};

export const createTestApp = async (): Promise<TestAppContext> => {
  const { pool, db } = createDatabase();
  const redis = createRedisClient();
  const auditLogService = new AuditLogService(db);
  const settingsService = new SettingsService(db, auditLogService);
  const authService = new AuthService(db, auditLogService);
  const userManagementService = new UserManagementService(db, auditLogService);
  const minioService = new MinioService(db, new S3StorageProvider(), process.env.STORAGE_BUCKET ?? 'pltu-files');
  const fileService = new FileService(minioService, auditLogService, db);
  const villageService = new VillageService(db, auditLogService);
  const robGuardianService = new RobGuardianService(db, auditLogService, settingsService);
  const emailQueue = new EmailQueueService();
  const emailService = new EmailService(emailQueue);
  const waterAssetService = new WaterAssetService(db, auditLogService);
  const waterReportService = new WaterReportService(db, auditLogService, emailService, settingsService);
  const waterAlertService = new WaterAlertService(db, auditLogService);
  const destinationService = new DestinationService(db, auditLogService);
  const boatOwnerService = new BoatOwnerService(db, auditLogService);
  const bookingService = new BookingService(db, auditLogService);
  const dashboardService = new DashboardService(db);
  const reportsService = new ReportsService(db);
  const weatherService = new WeatherService(settingsService, new VillageRepository(db));
  const commodityService = new CommodityService(db);
  const fishermanService = new FishermanService(db, auditLogService);
  const commodityInventoryService = new CommodityInventoryService(db, auditLogService);
  const commodityOrderService = new CommodityOrderService(db, auditLogService);
  const commodityPaymentService = new CommodityPaymentService(db);
  const manifestService = new ManifestService(db, auditLogService);
  const agencyService = new AgencyService(db, emailService, auditLogService, settingsService);
  const auditLogQueryService = new AuditLogQueryService(db);

  await minioService.init();

  const app = createApp({
    logger,
    db: db as DatabaseClient,
    redis,
    authService,
    userManagementService,
    fileService,
    villageService,
    robGuardianService,
    waterAssetService,
    waterReportService,
    waterAlertService,
    destinationService,
    boatOwnerService,
    bookingService,
    fishermanService,
    commodityInventoryService,
    commodityOrderService,
    commodityPaymentService,
    manifestService,
    agencyService,
    settingsService,
    auditLogQueryService,
    auditLogService,
    minioService,
    dashboardService,
    reportsService,
    commodityService,
    weatherService,
  });

  return {
    app,
    pool,
    db,
    redis,
    auditLogService,
    robGuardianService,
    bookingService,
    settingsService,
  };
};

export const closeTestApp = async (context?: TestAppContext): Promise<void> => {
  if (!context) {
    return;
  }

  await Promise.allSettled([context.redis.quit(), context.pool.end()]);
};
