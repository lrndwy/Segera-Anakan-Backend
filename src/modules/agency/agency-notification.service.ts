import { randomUUID } from 'crypto';

import { NotFoundException, ValidationException } from '../../lib/exceptions';
import type { EmailService } from '../../services/email.service';
import type { AuditLogService } from '../../services/audit-log.service';
import type { SettingsService } from '../settings/settings.service';
import { AgencyNotificationLogRepository } from './agency-notification-log.repository';
import { AgencyRepository } from './agency.repository';
import { EmailLogRepository } from './email-log.repository';
import type { SendAgencyEmailInput, SendAgencyWhatsAppInput } from './agency.schema';
import type { AgencyServiceMeta, SendAgencyEmailResponse, SendAgencyWhatsAppResponse } from './agency.types';

export type AgencyNotificationWebhookPayload = {
  event: 'AGENCY_NOTIFICATION';
  agencyId: string;
  message: string;
};

export class AgencyNotificationService {
  private readonly agencyRepository: AgencyRepository;
  private readonly agencyNotificationLogRepository: AgencyNotificationLogRepository;
  private readonly emailLogRepository: EmailLogRepository;
  private readonly settingsService: SettingsService;

  constructor(
    db: import('../../db/client').DatabaseClient,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
    settingsService: SettingsService,
  ) {
    this.agencyRepository = new AgencyRepository(db);
    this.agencyNotificationLogRepository = new AgencyNotificationLogRepository(db);
    this.emailLogRepository = new EmailLogRepository(db);
    this.settingsService = settingsService;
  }

  async sendEmail(agencyId: string, input: SendAgencyEmailInput, meta: AgencyServiceMeta): Promise<SendAgencyEmailResponse> {
    const agency = await this.agencyRepository.findById(agencyId);

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    if (!agency.email?.trim()) {
      throw new ValidationException('Validation failed', [{ field: 'email', message: 'Agency email is not available' }]);
    }

    let emailStatus = 'QUEUED';
    let errorMessage: string | null = null;

    try {
      await this.emailService.send({
        to: agency.email,
        subject: input.subject,
        html: `<p>${input.message}</p>`,
        text: input.message,
      });
    } catch (error) {
      emailStatus = 'FAILED';
      errorMessage = error instanceof Error ? error.message : 'Email queue failed';
    }

    const emailLog = await this.emailLogRepository.create({
      id: randomUUID(),
      recipientEmail: agency.email,
      subject: input.subject,
      status: emailStatus,
      errorMessage,
    });

    const agencyNotificationLog = await this.agencyNotificationLogRepository.createAgencyNotificationLog({
      id: randomUUID(),
      agencyId: agency.id,
      channel: 'EMAIL',
      subject: input.subject,
      message: input.message,
      status: emailStatus,
      response: errorMessage,
      createdBy: meta.actorUserId,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'SEND_AGENCY_EMAIL',
      module: 'AGENCY',
      entityType: 'agencies',
      entityId: agencyId,
      ipAddress: meta.ipAddress,
      newData: {
        emailLogId: emailLog.id,
        agencyNotificationLogId: agencyNotificationLog.id,
        status: emailStatus,
      },
    });

    return {
      emailLogId: emailLog.id,
      agencyNotificationLogId: agencyNotificationLog.id,
      status: emailStatus,
    };
  }

  async sendWhatsApp(agencyId: string, input: SendAgencyWhatsAppInput, meta: AgencyServiceMeta): Promise<SendAgencyWhatsAppResponse> {
    const agency = await this.agencyRepository.findById(agencyId);

    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    if (!agency.phone?.trim()) {
      throw new ValidationException('Validation failed', [{ field: 'phone', message: 'Agency phone is not available' }]);
    }

    const payload: AgencyNotificationWebhookPayload = {
      event: 'AGENCY_NOTIFICATION',
      agencyId: agency.id,
      message: input.message,
    };

    const webhookUrl = (await this.settingsService.get('WHATSAPP_WEBHOOK_URL'))?.trim();
    let webhookStatus = 'SKIPPED';
    let webhookResponse: string | null = null;

    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15_000),
        });

        webhookStatus = response.ok ? 'SENT' : 'FAILED';
        webhookResponse = `HTTP ${response.status}`;
      } catch (error) {
        webhookStatus = 'FAILED';
        webhookResponse = error instanceof Error ? error.message : 'Webhook request failed';
      }
    }

    const notificationLog = await this.agencyNotificationLogRepository.createNotificationLog({
      id: randomUUID(),
      eventName: payload.event,
      channel: 'WEBHOOK',
      payload: { ...payload, phone: agency.phone, response: webhookResponse },
      status: webhookStatus,
    });

    const agencyNotificationLog = await this.agencyNotificationLogRepository.createAgencyNotificationLog({
      id: randomUUID(),
      agencyId: agency.id,
      channel: 'WHATSAPP',
      message: input.message,
      status: webhookStatus,
      response: webhookResponse,
      createdBy: meta.actorUserId,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'SEND_AGENCY_WHATSAPP',
      module: 'AGENCY',
      entityType: 'agencies',
      entityId: agencyId,
      ipAddress: meta.ipAddress,
      newData: {
        notificationLogId: notificationLog.id,
        agencyNotificationLogId: agencyNotificationLog.id,
        status: webhookStatus,
      },
    });

    return {
      notificationLogId: notificationLog.id,
      agencyNotificationLogId: agencyNotificationLog.id,
      status: webhookStatus,
    };
  }
}
