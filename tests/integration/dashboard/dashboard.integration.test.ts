import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { env } from '../../../src/config/env';
import { assertErrorEnvelope, assertSuccessEnvelope, authHeader } from '../../helpers/assertions';
import { resetAnalyticsTestData, seedAnalyticsFixtures } from '../../helpers/analytics-db';
import { runMigrations } from '../../helpers/migrate';
import { closeTestApp, createTestApp, type TestAppContext } from '../../helpers/test-app';
import { getTestTokens, seedTestUsers, type TestTokens } from '../../helpers/test-users';

describe('Dashboard Integration', () => {
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
    await resetAnalyticsTestData(context.db);
    await seedAnalyticsFixtures(context.db);
  });

  describe('GET /dashboard/stats', () => {
    it('happy path — returns 200 for admin kecamatan', async () => {
      const response = await context.app.request(`${api}/dashboard/stats`, {
        headers: authHeader(tokens.adminKecamatan),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect((body as { data: Record<string, unknown> }).data).toMatchObject({
        totalRevenue: expect.any(Number),
        activeBookings: expect.any(Number),
        totalFishermen: expect.any(Number),
        totalCommodities: expect.any(Number),
        revenueGrowth: expect.any(Number),
        bookingGrowth: expect.any(Number),
      });
    });

    it('ownership — admin kecamatan sees all villages', async () => {
      const response = await context.app.request(`${api}/dashboard/stats`, {
        headers: authHeader(tokens.adminKecamatan),
      });
      const body = (await response.json()) as { data: { totalRevenue: number; activeBookings: number; totalFishermen: number } };

      expect(response.status).toBe(200);
      expect(body.data.totalRevenue).toBe(700000);
      expect(body.data.activeBookings).toBe(3);
      expect(body.data.totalFishermen).toBe(2);
    });

    it('ownership — admin desa only sees own village', async () => {
      const response = await context.app.request(`${api}/dashboard/stats`, {
        headers: authHeader(tokens.adminDesaUjunggagak),
      });
      const body = (await response.json()) as { data: { totalRevenue: number; activeBookings: number; totalFishermen: number } };

      expect(response.status).toBe(200);
      expect(body.data.totalRevenue).toBe(375000);
      expect(body.data.activeBookings).toBe(2);
      expect(body.data.totalFishermen).toBe(1);
    });

    it('forbidden — returns 403 for kader desa', async () => {
      const response = await context.app.request(`${api}/dashboard/stats`, {
        headers: authHeader(tokens.kaderDesa),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('unauthorized — returns 401 without token', async () => {
      const response = await context.app.request(`${api}/dashboard/stats`);
      const body = await response.json();

      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });
  });
});
