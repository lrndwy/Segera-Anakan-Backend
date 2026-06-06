import { serve } from '@hono/node-server';

import { createApp } from './app';
import { createDatabase } from './db/client';
import { createRedisClient, env, logger } from './config';
import { S3StorageProvider } from './modules/storage/providers/s3.provider';
import { AuthService } from './modules/auth/auth.service';
import { UserManagementService } from './modules/user/user-management.service';
import { FileService } from './modules/file/file.service';
import { VillageService } from './modules/village/village.service';
import { RobGuardianService } from './modules/rob/rob-guardian.service';
import { WaterAlertService } from './modules/banyu-mili/water-alert.service';
import { WaterAssetService } from './modules/banyu-mili/water-asset.service';
import { WaterReportService } from './modules/banyu-mili/water-report.service';
import { BoatOwnerService } from './modules/tourism/boat-owner.service';
import { BookingService } from './modules/tourism/booking.service';
import { DestinationService } from './modules/tourism/destination.service';
import { FishermanService } from './modules/economy/fisherman.service';
import { CommodityInventoryService } from './modules/economy/commodity-inventory.service';
import { CommodityOrderService } from './modules/economy/commodity-order.service';
import { CommodityPaymentService } from './modules/economy/commodity-payment.service';
import { ManifestService } from './modules/economy/manifest.service';
import { AgencyService } from './modules/agency/agency.service';
import { SettingsService } from './modules/settings/settings.service';
import { AuditLogQueryService } from './modules/audit-log/audit-log.service';
import { EmailQueueService } from './modules/job/queues/email.queue';
import { AuditLogService } from './services/audit-log.service';
import { EmailService } from './services/email.service';
import { MinioService } from './services/minio.service';

const bootstrap = async () => {
  const { pool, db } = createDatabase();
  const redis = createRedisClient();
  const auditLogService = new AuditLogService(db);
  const settingsService = new SettingsService(db, auditLogService);
  const authService = new AuthService(db, auditLogService);
  const userManagementService = new UserManagementService(db, auditLogService);
  const minioService = new MinioService(db, new S3StorageProvider(), env.STORAGE_BUCKET);
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
    db,
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
  });

  const server = serve({ fetch: app.fetch, port: env.PORT });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down HTTP server');
    server.close();
    await Promise.allSettled([redis.quit(), pool.end()]);
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'unhandled rejection');
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'uncaught exception');
  });

  logger.info({ port: env.PORT, prefix: env.API_PREFIX }, 'HTTP server started');
};

void bootstrap();
