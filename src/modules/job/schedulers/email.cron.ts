import type { EmailQueueService } from '../queues/email.queue';

export const registerEmailCronJobs = async (emailQueue: EmailQueueService) => {
  await emailQueue.scheduleDigestEmail({
    to: 'ops@example.com',
    subject: 'Daily digest',
    html: '<p>Daily digest placeholder</p>',
    text: 'Daily digest placeholder',
  });
};
