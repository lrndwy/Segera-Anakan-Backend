import { sql } from 'drizzle-orm';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { Logger } from 'pino';
import type Redis from 'ioredis';

import { env } from './config/env';
import type { Database } from './db/client';
import { openApiInfo } from './lib/openapi';
import { createOpenAPIRouter } from './lib/openapi-router';
import './lib/openapi-schema';
import { successResponse } from './lib/response';
import { createAuthMiddleware } from './middlewares/auth.middleware';
import { createErrorHandler, createNotFoundHandler } from './middlewares/error-handler.middleware';
import { createRateLimitMiddleware } from './middlewares/rate-limit.middleware';
import { createRequestLoggerMiddleware } from './middlewares/request-logger.middleware';
import { requestContextMiddleware } from './middlewares/request-context.middleware';
import { createAuthRouter } from './modules/auth/auth.routes';
import type { AuthService } from './modules/auth/auth.service';
import { createUserRouter } from './modules/user/user.routes';
import type { UserManagementService } from './modules/user/user-management.service';
import { createFileRouter } from './modules/file/file.routes';
import type { FileService } from './modules/file/file.service';
import {
  createAdminRobRouter,
  createPublicRobHistoriesRouter,
  createPublicRobRouter,
} from './modules/rob/rob.routes';
import type { RobGuardianService } from './modules/rob/rob-guardian.service';
import { createVillageRouter } from './modules/village/village.routes';
import type { VillageService } from './modules/village/village.service';
import {
  createPublicWaterStatusRouter,
  createWaterAlertsRouter,
  createWaterAssetsRouter,
  createWaterReportsRouter,
} from './modules/banyu-mili/water.routes';
import type { WaterAlertService } from './modules/banyu-mili/water-alert.service';
import type { WaterAssetService } from './modules/banyu-mili/water-asset.service';
import type { WaterReportService } from './modules/banyu-mili/water-report.service';
import {
  createBoatOwnersRouter,
  createBookingPaymentsRouter,
  createBookingsRouter,
  createDestinationsRouter,
} from './modules/tourism/tourism.routes';
import type { BoatOwnerService } from './modules/tourism/boat-owner.service';
import type { BookingService } from './modules/tourism/booking.service';
import type { DestinationService } from './modules/tourism/destination.service';
import {
  createCommodityInventoryRouter,
  createCommodityOrdersRouter,
  createCommodityPaymentsRouter,
  createFishermenRouter,
  createManifestsRouter,
} from './modules/economy/economy.routes';
import type { CommodityInventoryService } from './modules/economy/commodity-inventory.service';
import type { CommodityOrderService } from './modules/economy/commodity-order.service';
import type { CommodityPaymentService } from './modules/economy/commodity-payment.service';
import type { FishermanService } from './modules/economy/fisherman.service';
import type { ManifestService } from './modules/economy/manifest.service';
import { createAgenciesRouter } from './modules/agency/agency.routes';
import type { AgencyService } from './modules/agency/agency.service';
import { createSettingsRouter } from './modules/settings/settings.routes';
import type { SettingsService } from './modules/settings/settings.service';
import { createAuditLogRouter } from './modules/audit-log/audit-log.routes';
import type { AuditLogQueryService } from './modules/audit-log/audit-log.service';
import type { AuditLogService } from './services/audit-log.service';
import type { MinioService } from './services/minio.service';
import type { AppEnv } from './types/app-env';

type CreateAppDeps = {
  logger: Logger;
  db: Database;
  redis: Redis;
  authService: AuthService;
  userManagementService: UserManagementService;
  fileService: FileService;
  villageService: VillageService;
  robGuardianService: RobGuardianService;
  waterAssetService: WaterAssetService;
  waterReportService: WaterReportService;
  waterAlertService: WaterAlertService;
  destinationService: DestinationService;
  boatOwnerService: BoatOwnerService;
  bookingService: BookingService;
  fishermanService: FishermanService;
  commodityInventoryService: CommodityInventoryService;
  commodityOrderService: CommodityOrderService;
  commodityPaymentService: CommodityPaymentService;
  manifestService: ManifestService;
  agencyService: AgencyService;
  settingsService: SettingsService;
  auditLogQueryService: AuditLogQueryService;
  auditLogService: AuditLogService;
  minioService: MinioService;
};

export const createApp = ({ logger, db, redis, authService, userManagementService, fileService, villageService, robGuardianService, waterAssetService, waterReportService, waterAlertService, destinationService, boatOwnerService, bookingService, fishermanService, commodityInventoryService, commodityOrderService, commodityPaymentService, manifestService, agencyService, settingsService, auditLogQueryService, auditLogService: _auditLogService, minioService: _minioService }: CreateAppDeps) => {
  const app = createOpenAPIRouter();
  const authMiddleware = createAuthMiddleware({ db });

  app.use('*', requestContextMiddleware);
  app.use('*', createRequestLoggerMiddleware(logger));
  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: env.corsOrigins,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
      exposeHeaders: ['X-Request-Id', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
      credentials: true,
    }),
  );
  app.use('*', createRateLimitMiddleware(redis));

  app.onError(createErrorHandler(logger));
  app.notFound(createNotFoundHandler());

  app.get('/health', (context) => {
    return context.json(successResponse('Service is healthy', {
      status: 'ok',
      appName: env.APP_NAME,
      requestId: context.get('requestId'),
      uptimeSeconds: process.uptime(),
    }));
  });

  app.get('/ready', async (context) => {
    await Promise.all([db.execute(sql`select 1`), redis.ping()]);

    return context.json(successResponse('Service is ready', { status: 'ready', db: true, redis: true }));
  });

  app.route(`${env.API_PREFIX}/auth`, createAuthRouter({ authService, authMiddleware }));
  app.route(`${env.API_PREFIX}/users`, createUserRouter({ userManagementService, authMiddleware }));
  app.route(`${env.API_PREFIX}/files`, createFileRouter({ fileService, authMiddleware }));
  app.route(`${env.API_PREFIX}/villages`, createVillageRouter({ villageService, authMiddleware }));
  app.route(`${env.API_PREFIX}/rob-status`, createPublicRobRouter(robGuardianService));
  app.route(`${env.API_PREFIX}/rob-histories`, createPublicRobHistoriesRouter(robGuardianService));
  app.route(`${env.API_PREFIX}/rob`, createAdminRobRouter({ robGuardianService, authMiddleware }));
  app.route(`${env.API_PREFIX}/water-status`, createPublicWaterStatusRouter(waterReportService));
  app.route(`${env.API_PREFIX}/water-assets`, createWaterAssetsRouter({ waterAssetService, authMiddleware }));
  app.route(`${env.API_PREFIX}/water-reports`, createWaterReportsRouter({ waterReportService, authMiddleware }));
  app.route(`${env.API_PREFIX}/water-alerts`, createWaterAlertsRouter({ waterAlertService, authMiddleware }));
  app.route(`${env.API_PREFIX}/destinations`, createDestinationsRouter({ destinationService, authMiddleware }));
  app.route(`${env.API_PREFIX}/boat-owners`, createBoatOwnersRouter({ boatOwnerService, authMiddleware }));
  app.route(`${env.API_PREFIX}/bookings`, createBookingsRouter({ bookingService, authMiddleware }));
  app.route(`${env.API_PREFIX}/booking-payments`, createBookingPaymentsRouter(bookingService));
  app.route(`${env.API_PREFIX}/fishermen`, createFishermenRouter({ fishermanService, authMiddleware }));
  app.route(`${env.API_PREFIX}/commodity-inventory`, createCommodityInventoryRouter({ commodityInventoryService, authMiddleware }));
  app.route(`${env.API_PREFIX}/commodity-orders`, createCommodityOrdersRouter({ commodityOrderService, authMiddleware }));
  app.route(`${env.API_PREFIX}/commodity-payments`, createCommodityPaymentsRouter(commodityPaymentService));
  app.route(`${env.API_PREFIX}/manifests`, createManifestsRouter({ manifestService, authMiddleware }));
  app.route(`${env.API_PREFIX}/agencies`, createAgenciesRouter({ agencyService, authMiddleware }));
  app.route(`${env.API_PREFIX}/settings`, createSettingsRouter({ settingsService, authMiddleware }));
  app.route(`${env.API_PREFIX}/audit-logs`, createAuditLogRouter({ auditLogQueryService, authMiddleware }));

  app.openAPIRegistry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  });

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: openApiInfo.info,
    servers: [...openApiInfo.servers],
  });

  app.get('/docs', swaggerUI({ url: '/openapi.json' }));

  return app;
};
