import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { env } from '../../../src/config/env';
import { BmkgService } from '../../../src/modules/rob/bmkg.service';
import { assertSuccessEnvelope } from '../../helpers/assertions';
import { runMigrations } from '../../helpers/migrate';
import { closeTestApp, createTestApp, type TestAppContext } from '../../helpers/test-app';

describe('Weather Integration', () => {
  let context: TestAppContext;
  const api = env.API_PREFIX;

  beforeAll(async () => {
    await runMigrations();
    context = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  describe('GET /weather/forecast', () => {
    it('happy path — returns 7-day forecast', async () => {
      vi.spyOn(BmkgService.prototype, 'fetchWeeklyForecast').mockResolvedValueOnce([
        {
          date: '2026-06-08',
          type: 'Cerah',
          temp: 31,
          hum: 80,
          wind: 15,
          hourly: [
            { time: '06:00', type: 'Cerah', temp: 26 },
            { time: '12:00', type: 'Berawan', temp: 32 },
          ],
        },
      ]);

      const response = await context.app.request(`${api}/weather/forecast`);
      const body = await response.json();

      expect(response.status).toBe(200);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect((body as { message: string }).message).toBe('Prakiraan cuaca berhasil diambil');

      const data = (body as { data: Array<Record<string, unknown>> }).data;
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toMatchObject({
        date: '2026-06-08',
        type: 'Cerah',
        temp: 31,
        hum: 80,
        wind: 15,
        hourly: expect.any(Array),
      });
    });
  });
});
