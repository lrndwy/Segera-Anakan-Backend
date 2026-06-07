import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { env } from '../../../src/config/env';
import { assertErrorEnvelope, assertSuccessEnvelope, authHeader } from '../../helpers/assertions';
import { resetAnalyticsTestData, seedAnalyticsFixtures } from '../../helpers/analytics-db';
import { runMigrations } from '../../helpers/migrate';
import { closeTestApp, createTestApp, type TestAppContext } from '../../helpers/test-app';
import { getTestTokens, seedTestUsers, type TestTokens } from '../../helpers/test-users';

describe('Reports Integration', () => {
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

  describe('GET /reports', () => {
    it('happy path — returns chart data for date range', async () => {
      const response = await context.app.request(`${api}/reports?start_date=2026-06-01&end_date=2026-06-02`, {
        headers: authHeader(tokens.adminKecamatan),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      assertSuccessEnvelope(body as Record<string, unknown>);

      const data = (body as { data: { chartData: Array<{ date: string; revenue: number; visitors: number }>; summary: { averageDailyRevenue: number; totalPeriodRevenue: number } } }).data;
      expect(data.chartData).toHaveLength(2);
      expect(data.chartData[0]).toMatchObject({ date: '2026-06-01', revenue: expect.any(Number), visitors: expect.any(Number) });
      expect(data.summary.totalPeriodRevenue).toBeGreaterThan(0);
      expect(data.summary.averageDailyRevenue).toBeGreaterThan(0);
    });

    it('ownership — admin desa only sees own village revenue', async () => {
      const response = await context.app.request(`${api}/reports?start_date=2026-06-01&end_date=2026-06-01`, {
        headers: authHeader(tokens.adminDesaUjunggagak),
      });
      const body = (await response.json()) as {
        data: { chartData: Array<{ revenue: number; visitors: number }>; summary: { totalPeriodRevenue: number } };
      };

      expect(response.status).toBe(200);
      expect(body.data.chartData[0]?.revenue).toBe(225000);
      expect(body.data.chartData[0]?.visitors).toBe(10);
      expect(body.data.summary.totalPeriodRevenue).toBe(225000);
    });

    it('ownership — admin kecamatan sees all villages', async () => {
      const response = await context.app.request(`${api}/reports?start_date=2026-06-01&end_date=2026-06-01`, {
        headers: authHeader(tokens.adminKecamatan),
      });
      const body = (await response.json()) as {
        data: { summary: { totalPeriodRevenue: number } };
      };

      expect(response.status).toBe(200);
      expect(body.data.summary.totalPeriodRevenue).toBe(350000);
    });

    it('validation — returns 422 when end_date is before start_date', async () => {
      const response = await context.app.request(`${api}/reports?start_date=2026-06-05&end_date=2026-06-01`, {
        headers: authHeader(tokens.adminKecamatan),
      });
      const body = await response.json();

      expect(response.status).toBe(422);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('forbidden — returns 403 for kader desa', async () => {
      const response = await context.app.request(`${api}/reports?start_date=2026-06-01&end_date=2026-06-02`, {
        headers: authHeader(tokens.kaderDesa),
      });

      expect(response.status).toBe(403);
    });
  });
});
