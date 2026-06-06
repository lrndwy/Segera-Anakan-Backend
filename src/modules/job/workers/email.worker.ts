import { Worker } from 'bullmq';
import type { Logger } from 'pino';

import { createBullMqConnection, env } from '../../../config';
import type { EmailJobData } from '../job.types';

export const startEmailWorker = (logger: Logger) => {
  const worker = new Worker<EmailJobData>(
    env.EMAIL_QUEUE_NAME,
    async (job) => {
      logger.info({ jobId: job.id, name: job.name, data: job.data }, 'processing email job');
      return {
        delivered: true,
        to: job.data.to,
      };
    },
    {
      ...createBullMqConnection(),
      concurrency: 5,
    },
  );

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, name: job.name }, 'email job completed');
  });

  worker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, name: job?.name, error }, 'email job failed');
  });

  return worker;
};
