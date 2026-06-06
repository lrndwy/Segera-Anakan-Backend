import type { RobStatus } from '../../constants';
import type { SettingsService } from '../settings/settings.service';
import type { RobRepository } from './rob.repository';

export type WebhookPayload = {
  event: 'ROB_STATUS_CHANGED' | 'ROB_WEBHOOK_TEST';
  status: RobStatus;
  score: number;
};

export class WebhookService {
  constructor(
    private readonly robRepository: RobRepository,
    private readonly settingsService: SettingsService,
  ) {}

  async sendStatusChanged(status: RobStatus, score: number): Promise<void> {
    await this.dispatch({
      event: 'ROB_STATUS_CHANGED',
      status,
      score,
    });
  }

  async sendTest(status: RobStatus, score: number): Promise<void> {
    await this.dispatch({
      event: 'ROB_WEBHOOK_TEST',
      status,
      score,
    });
  }

  private async dispatch(payload: WebhookPayload): Promise<void> {
    const webhookUrl = (await this.settingsService.get('WHATSAPP_WEBHOOK_URL'))?.trim();

    if (!webhookUrl) {
      await this.robRepository.createWebhookLog({
        eventName: payload.event,
        payload,
        responseStatus: null,
        responseBody: 'Webhook URL is not configured',
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

      const responseBody = await response.text();

      await this.robRepository.createWebhookLog({
        eventName: payload.event,
        payload,
        responseStatus: response.status,
        responseBody,
      });
    } catch (error) {
      await this.robRepository.createWebhookLog({
        eventName: payload.event,
        payload,
        responseStatus: null,
        responseBody: error instanceof Error ? error.message : 'Webhook request failed',
      });
    }
  }
}
