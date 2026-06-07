import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../../../src/config/env';
import { RobStatus } from '../../../src/constants';
import {
  assertErrorEnvelope,
  assertPaginatedEnvelope,
  assertSuccessEnvelope,
  authHeader,
} from '../../helpers/assertions';
import { runMigrations } from '../../helpers/migrate';
import {
  clearRobCurrentStatus,
  countAuditLogsByAction,
  countHistories,
  countManualOverrides,
  getCurrentRobStatus,
  getLatestAuditLog,
  getLatestWebhookLog,
  resetRobTestData,
  restoreRobCurrentStatus,
} from '../../helpers/rob-db';
import { closeTestApp, createTestApp, type TestAppContext } from '../../helpers/test-app';
import { getTestTokens, seedTestUsers, type TestTokens } from '../../helpers/test-users';

describe('ROB Guardian Integration', () => {
  let context: TestAppContext;
  let tokens: TestTokens;
  const api = env.API_PREFIX;

  beforeAll(async () => {
    await runMigrations();
    context = await createTestApp();
    await seedTestUsers(context.db);
    tokens = await getTestTokens(context);
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await resetRobTestData(context.db);
  });

  describe('GET /rob-status', () => {
    it('happy path — returns 200 with current status', async () => {
      const response = await context.app.request(`${api}/rob-status`);
      const body = await response.json();

      expect(response.status).toBe(200);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect((body as { data: Record<string, unknown> }).data).toMatchObject({
        status: RobStatus.AMAN,
        score: expect.any(Number),
        waveHeight: expect.any(Number),
        tideHeight: expect.any(Number),
        rainfall: expect.any(Number),
        recordedAt: expect.any(String),
      });
    });

    it('response format — success envelope with data object', async () => {
      const response = await context.app.request(`${api}/rob-status`);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.any(String),
          data: expect.any(Object),
        }),
      );
    });

    it('not found — returns 404 when snapshot is missing', async () => {
      await clearRobCurrentStatus(context.db);

      const response = await context.app.request(`${api}/rob-status`);
      const body = await response.json();

      expect(response.status).toBe(404);
      assertErrorEnvelope(body as Record<string, unknown>);

      await restoreRobCurrentStatus(context.db);
    });
  });

  describe('GET /rob-histories', () => {
    it('happy path — returns 200 with paginated histories', async () => {
      const response = await context.app.request(`${api}/rob-histories?page=1&limit=10`);
      const body = await response.json();

      expect(response.status).toBe(200);
      assertPaginatedEnvelope(body as Record<string, unknown>);
    });

    it('response format — paginated success envelope', async () => {
      const response = await context.app.request(`${api}/rob-histories`);
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.meta).toBeDefined();
    });

    it('validation — returns 422 for invalid page', async () => {
      const response = await context.app.request(`${api}/rob-histories?page=0`);
      const body = await response.json();

      expect(response.status).toBe(422);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('validation — returns 422 for invalid date filter', async () => {
      const response = await context.app.request(`${api}/rob-histories?start_date=not-a-date`);
      const body = await response.json();

      expect(response.status).toBe(422);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('business flow — manual override appears in history list', async () => {
      const overrideResponse = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          status: RobStatus.WASPADA,
          reason: 'Integration test override',
        }),
      });

      expect(overrideResponse.status).toBe(201);

      const historyResponse = await context.app.request(`${api}/rob-histories?limit=1`);
      const historyBody = (await historyResponse.json()) as {
        data: Array<{ status: string; notes: string | null }>;
      };

      expect(historyResponse.status).toBe(200);
      expect(historyBody.data[0]?.status).toBe(RobStatus.WASPADA);
      expect(historyBody.data[0]?.notes).toBe('Integration test override');
    });
  });

  describe('POST /rob/manual-override', () => {
    it('happy path — returns 201 when admin kecamatan overrides status', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          status: RobStatus.BAHAYA,
          reason: 'Manual escalation for testing',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual({
        success: true,
        message: 'Manual override applied successfully',
      });

      const current = await getCurrentRobStatus(context.db);
      expect(current?.status).toBe(RobStatus.BAHAYA);
      expect(current?.source).toBe('MANUAL_OVERRIDE');
    });

    it('response format — message-only success envelope', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          status: RobStatus.AMAN,
          reason: 'Format check',
        }),
      });
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(typeof body.message).toBe('string');
      expect(body.data).toBeUndefined();
    });

    it('validation — returns 422 for empty reason', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          status: RobStatus.AMAN,
          reason: '   ',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(422);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('validation — returns 422 for invalid status', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          status: 'INVALID',
          reason: 'Invalid status test',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(422);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('unauthorized — returns 401 without token', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: RobStatus.AMAN,
          reason: 'No auth',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('forbidden — returns 403 for admin desa', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminDesaUjunggagak),
        body: JSON.stringify({
          status: RobStatus.WASPADA,
          reason: 'Should be denied',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('forbidden — returns 403 for kader desa', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.kaderDesa),
        body: JSON.stringify({
          status: RobStatus.WASPADA,
          reason: 'Should be denied',
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('ownership — returns 403 for admin desa from different village (global resource, role-based)', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminDesaUjungalang),
        body: JSON.stringify({
          status: RobStatus.WASPADA,
          reason: 'Cross-village attempt',
        }),
      });

      expect(response.status).toBe(403);
    });

    it('audit log — creates ROB_OVERRIDE entry with correct fields', async () => {
      const beforeCount = await countAuditLogsByAction(context.db, 'ROB_OVERRIDE');

      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          status: RobStatus.WASPADA,
          reason: 'Audit log verification',
        }),
      });

      expect(response.status).toBe(201);

      const auditLog = await getLatestAuditLog(context.db, 'ROB_OVERRIDE');
      expect(auditLog).not.toBeNull();
      expect(auditLog?.module).toBe('ROB_GUARDIAN');
      expect(auditLog?.entityType).toBe('rob_manual_overrides');
      expect(auditLog?.entityId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(await countAuditLogsByAction(context.db, 'ROB_OVERRIDE')).toBe(beforeCount + 1);
    });

    it('business flow — updates status snapshot and creates override record', async () => {
      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          status: RobStatus.WASPADA,
          reason: 'End-to-end business flow',
        }),
      });

      expect(response.status).toBe(201);

      const statusResponse = await context.app.request(`${api}/rob-status`);
      const statusBody = (await statusResponse.json()) as { data: { status: string } };

      expect(statusResponse.status).toBe(200);
      expect(statusBody.data.status).toBe(RobStatus.WASPADA);
      expect(await countManualOverrides(context.db)).toBe(1);
      expect(await countHistories(context.db)).toBeGreaterThanOrEqual(1);
    });

    it('transaction — rolls back multi-table writes when audit log fails', async () => {
      const overridesBefore = await countManualOverrides(context.db);
      const historiesBefore = await countHistories(context.db);
      const statusBefore = await getCurrentRobStatus(context.db);

      vi.spyOn(context.auditLogService, 'create').mockRejectedValueOnce(new Error('Simulated audit failure'));

      const response = await context.app.request(`${api}/rob/manual-override`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          status: RobStatus.BAHAYA,
          reason: 'Transaction rollback test',
        }),
      });

      expect(response.status).toBe(500);

      const overridesAfter = await countManualOverrides(context.db);
      const historiesAfter = await countHistories(context.db);
      const statusAfter = await getCurrentRobStatus(context.db);

      expect(overridesAfter).toBe(overridesBefore);
      expect(historiesAfter).toBe(historiesBefore);
      expect(statusAfter?.status).toBe(statusBefore?.status);
      expect(statusAfter?.source).toBe(statusBefore?.source);
    });
  });

  describe('POST /rob/webhook/test', () => {
    it('happy path — returns 201 for admin kecamatan', async () => {
      const response = await context.app.request(`${api}/rob/webhook/test`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
      });
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toEqual({
        success: true,
        message: 'Webhook test sent successfully',
      });
    });

    it('response format — message-only success envelope', async () => {
      const response = await context.app.request(`${api}/rob/webhook/test`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
      });
      const body = (await response.json()) as Record<string, unknown>;

      expect(response.status).toBe(201);
      expect(body.success).toBe(true);
      expect(typeof body.message).toBe('string');
      expect(body.data).toBeUndefined();
    });

    it('unauthorized — returns 401 without token', async () => {
      const response = await context.app.request(`${api}/rob/webhook/test`, {
        method: 'POST',
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('forbidden — returns 403 for admin desa', async () => {
      const response = await context.app.request(`${api}/rob/webhook/test`, {
        method: 'POST',
        headers: authHeader(tokens.adminDesaUjunggagak),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('forbidden — returns 403 for kader desa', async () => {
      const response = await context.app.request(`${api}/rob/webhook/test`, {
        method: 'POST',
        headers: authHeader(tokens.kaderDesa),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('ownership — returns 403 for admin desa from different village (global resource, role-based)', async () => {
      const response = await context.app.request(`${api}/rob/webhook/test`, {
        method: 'POST',
        headers: authHeader(tokens.adminDesaUjungalang),
      });

      expect(response.status).toBe(403);
    });

    it('audit log — creates ROB_WEBHOOK_TEST entry', async () => {
      const beforeCount = await countAuditLogsByAction(context.db, 'ROB_WEBHOOK_TEST');

      const response = await context.app.request(`${api}/rob/webhook/test`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
      });

      expect(response.status).toBe(201);

      const auditLog = await getLatestAuditLog(context.db, 'ROB_WEBHOOK_TEST');
      expect(auditLog).not.toBeNull();
      expect(auditLog?.module).toBe('ROB_GUARDIAN');
      expect(auditLog?.entityType).toBe('rob_webhook_logs');
      expect(auditLog?.entityId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(await countAuditLogsByAction(context.db, 'ROB_WEBHOOK_TEST')).toBe(beforeCount + 1);
    });

    it('business flow — creates webhook log entry', async () => {
      const response = await context.app.request(`${api}/rob/webhook/test`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
      });

      expect(response.status).toBe(201);

      const webhookLog = await getLatestWebhookLog(context.db);
      expect(webhookLog).not.toBeNull();
      expect(webhookLog?.eventName).toBe('ROB_WEBHOOK_TEST');
    });
  });

  describe('POST /rob/webhook/village-alert', () => {
    it('happy path — returns 200 for admin kecamatan', async () => {
      const response = await context.app.request(`${api}/rob/webhook/village-alert`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          villageId: '11111111-1111-4111-8111-111111111101',
          message: 'Peringatan! Air rob naik.',
          severityLevel: RobStatus.BAHAYA,
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        success: true,
        message: 'Alert sent to village successfully',
      });
    });

    it('not found — returns 404 for unknown village', async () => {
      const response = await context.app.request(`${api}/rob/webhook/village-alert`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          villageId: '00000000-0000-4000-8000-000000000099',
          message: 'Peringatan!',
          severityLevel: RobStatus.WASPADA,
        }),
      });
      const body = await response.json();

      expect(response.status).toBe(404);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('webhook failure — still logs webhook and audit entry', async () => {
      vi.spyOn(context.settingsService, 'get').mockImplementation(async (key: string) => {
        if (key === 'WHATSAPP_WEBHOOK_URL') {
          return 'http://localhost:9999/webhook';
        }

        return null;
      });
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Webhook unreachable'));

      const beforeCount = await countAuditLogsByAction(context.db, 'SEND_VILLAGE_ALERT');

      const response = await context.app.request(`${api}/rob/webhook/village-alert`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          villageId: '11111111-1111-4111-8111-111111111101',
          message: 'Webhook failure test',
          severityLevel: RobStatus.BAHAYA,
        }),
      });

      expect(response.status).toBe(200);

      const webhookLog = await getLatestWebhookLog(context.db);
      expect(webhookLog?.eventName).toBe('ROB_VILLAGE_ALERT');
      expect(webhookLog?.responseStatus).toBeNull();
      expect(webhookLog?.responseBody).toContain('Webhook unreachable');

      const auditLog = await getLatestAuditLog(context.db, 'SEND_VILLAGE_ALERT');
      expect(auditLog).not.toBeNull();
      expect(auditLog?.module).toBe('ROB_GUARDIAN');
      expect(await countAuditLogsByAction(context.db, 'SEND_VILLAGE_ALERT')).toBe(beforeCount + 1);
    });

    it('audit log — creates SEND_VILLAGE_ALERT entry', async () => {
      const beforeCount = await countAuditLogsByAction(context.db, 'SEND_VILLAGE_ALERT');

      const response = await context.app.request(`${api}/rob/webhook/village-alert`, {
        method: 'POST',
        headers: authHeader(tokens.adminKecamatan),
        body: JSON.stringify({
          villageId: '11111111-1111-4111-8111-111111111102',
          message: 'Audit log verification',
          severityLevel: RobStatus.WASPADA,
        }),
      });

      expect(response.status).toBe(200);
      expect(await countAuditLogsByAction(context.db, 'SEND_VILLAGE_ALERT')).toBe(beforeCount + 1);
    });

    it('forbidden — returns 403 for admin desa', async () => {
      const response = await context.app.request(`${api}/rob/webhook/village-alert`, {
        method: 'POST',
        headers: authHeader(tokens.adminDesaUjunggagak),
        body: JSON.stringify({
          villageId: '11111111-1111-4111-8111-111111111101',
          message: 'Should be denied',
          severityLevel: RobStatus.AMAN,
        }),
      });

      expect(response.status).toBe(403);
    });
  });
});
