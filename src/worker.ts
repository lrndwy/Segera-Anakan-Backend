import { createDatabase } from './db/client';
import { createRedisClient, logger } from './config';
import { EmailQueueService } from './modules/job/queues/email.queue';
import { registerEmailCronJobs } from './modules/job/schedulers/email.cron';
import { registerRobCronJob } from './modules/job/schedulers/rob.cron';
import { startEmailWorker } from './modules/job/workers/email.worker';
import { RobGuardianService } from './modules/rob/rob-guardian.service';
import { SettingsService } from './modules/settings/settings.service';
import { AuditLogService } from './services/audit-log.service';

const bootstrap = async () => {
  const { pool, db } = createDatabase();
  const redis = createRedisClient();
  const emailQueue = new EmailQueueService();
  const worker = startEmailWorker(logger);
  const auditLogService = new AuditLogService(db);
  const settingsService = new SettingsService(db, auditLogService);
  const robGuardianService = new RobGuardianService(db, auditLogService, settingsService);
  const stopRobCron = registerRobCronJob(robGuardianService, logger);

  await registerEmailCronJobs(emailQueue);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'shutting down worker');
    stopRobCron();
    await Promise.allSettled([worker.close(), emailQueue.close(), redis.quit(), pool.end()]);
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  logger.info('Worker started');
};

void bootstrap();
