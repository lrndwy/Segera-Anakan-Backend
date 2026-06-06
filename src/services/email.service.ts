import type { EmailJobData } from '../modules/job/job.types';
import { EmailQueueService } from '../modules/job/queues/email.queue';

export class EmailService {
  constructor(private readonly emailQueue: EmailQueueService) {}

  async send(data: EmailJobData) {
    return this.emailQueue.enqueueNotificationEmail(data);
  }
}
