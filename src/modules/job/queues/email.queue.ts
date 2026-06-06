import { Queue } from 'bullmq';

import { createBullMqConnection, env } from '../../../config';
import type { EmailJobData } from '../job.types';

export class EmailQueueService {
  private readonly queue: Queue<EmailJobData>;

  constructor() {
    this.queue = new Queue<EmailJobData>(env.EMAIL_QUEUE_NAME, createBullMqConnection());
  }

  async enqueueWelcomeEmail(data: EmailJobData) {
    return this.queue.add('welcome-email', data, { removeOnComplete: 100, removeOnFail: 500 });
  }

  async enqueueDigestEmail(data: EmailJobData) {
    return this.queue.add('digest-email', data, { removeOnComplete: 100, removeOnFail: 500 });
  }

  async enqueueNotificationEmail(data: EmailJobData) {
    return this.queue.add('notification-email', data, { removeOnComplete: 100, removeOnFail: 500 });
  }

  async scheduleDigestEmail(data: EmailJobData) {
    return this.queue.add('daily-digest', data, {
      repeat: {
        pattern: '0 8 * * *',
        tz: 'UTC',
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }

  async close() {
    await this.queue.close();
  }
}
