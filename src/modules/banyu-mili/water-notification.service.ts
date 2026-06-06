import type { WaterStatus } from '../../constants';
import type { EmailService } from '../../services/email.service';
import type { SettingsService } from '../settings/settings.service';
import { AgencyRepository } from './agency.repository';

export type WaterCriticalWebhookPayload = {
  event: 'WATER_CRITICAL';
  villageId: string;
  status: WaterStatus;
};

export class WaterNotificationService {
  private readonly agencyRepository: AgencyRepository;
  private readonly settingsService: SettingsService;

  constructor(
    db: import('../../db/client').DatabaseClient,
    private readonly emailService: EmailService,
    settingsService: SettingsService,
  ) {
    this.agencyRepository = new AgencyRepository(db);
    this.settingsService = settingsService;
  }

  async notifyCriticalAlert(input: {
    villageId: string;
    villageName: string;
    assetName: string;
    status: WaterStatus;
    volumePercent: number;
    actorUserId?: string | undefined;
  }): Promise<void> {
    const payload: WaterCriticalWebhookPayload = {
      event: 'WATER_CRITICAL',
      villageId: input.villageId,
      status: input.status,
    };

    await this.agencyRepository.createNotificationLog({
      eventName: 'WATER_CRITICAL',
      channel: 'SYSTEM',
      payload,
      status: 'TRIGGERED',
    });

    await this.dispatchWebhook(payload);

    const agencies = await this.agencyRepository.findActiveAgencies();
    const subject = `[KRITIS] Status Air Desa ${input.villageName}`;
    const message = `Status air KRITIS terdeteksi pada aset ${input.assetName} (${input.volumePercent}%). Segera lakukan tindak lanjut.`;

    for (const agency of agencies) {
      if (agency.email) {
        try {
          await this.emailService.send({
            to: agency.email,
            subject,
            html: `<p>${message}</p>`,
            text: message,
          });

          await this.agencyRepository.createAgencyNotificationLog({
            agencyId: agency.id,
            channel: 'EMAIL',
            subject,
            message,
            status: 'QUEUED',
            createdBy: input.actorUserId ?? null,
          });
        } catch (error) {
          await this.agencyRepository.createAgencyNotificationLog({
            agencyId: agency.id,
            channel: 'EMAIL',
            subject,
            message,
            status: 'FAILED',
            response: error instanceof Error ? error.message : 'Email queue failed',
            createdBy: input.actorUserId ?? null,
          });
        }
      }
    }
  }

  private async dispatchWebhook(payload: WaterCriticalWebhookPayload): Promise<void> {
    const webhookUrl = (await this.settingsService.get('WHATSAPP_WEBHOOK_URL'))?.trim();

    if (!webhookUrl) {
      await this.agencyRepository.createNotificationLog({
        eventName: payload.event,
        channel: 'WEBHOOK',
        payload,
        status: 'SKIPPED',
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000),
      });

      await this.agencyRepository.createNotificationLog({
        eventName: payload.event,
        channel: 'WEBHOOK',
        payload: { ...payload, responseStatus: response.status },
        status: response.ok ? 'SENT' : 'FAILED',
      });
    } catch (error) {
      await this.agencyRepository.createNotificationLog({
        eventName: payload.event,
        channel: 'WEBHOOK',
        payload,
        status: 'FAILED',
      });
    }
  }
}
