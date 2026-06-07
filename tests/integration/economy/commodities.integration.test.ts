import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { env } from '../../../src/config/env';
import { assertSuccessEnvelope } from '../../helpers/assertions';
import { runMigrations } from '../../helpers/migrate';
import { closeTestApp, createTestApp, type TestAppContext } from '../../helpers/test-app';

describe('Commodities Catalog Integration', () => {
  let context: TestAppContext;
  const api = env.API_PREFIX;

  beforeAll(async () => {
    await runMigrations();
    context = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  describe('GET /commodities', () => {
    it('public access — returns 200 without token', async () => {
      const response = await context.app.request(`${api}/commodities`);
      const body = await response.json();

      expect(response.status).toBe(200);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect(Array.isArray((body as { data: unknown[] }).data)).toBe(true);
      expect((body as { data: unknown[] }).data.length).toBeGreaterThanOrEqual(3);
    });

    it('sorting — ordered by categoryName ASC then name ASC', async () => {
      const response = await context.app.request(`${api}/commodities`);
      const body = (await response.json()) as {
        data: Array<{ id: string; name: string; categoryName: string }>;
      };

      expect(response.status).toBe(200);

      const labels = body.data.map((item) => `${item.categoryName}:${item.name}`);
      const sorted = [...labels].sort((a, b) => a.localeCompare(b));
      expect(labels).toEqual(sorted);
    });

    it('search — filters by commodity or category name', async () => {
      const response = await context.app.request(`${api}/commodities?search=Bandeng`);
      const body = (await response.json()) as {
        data: Array<{ name: string; categoryName: string }>;
      };

      expect(response.status).toBe(200);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data.every((item) => item.name.includes('Bandeng') || item.categoryName.includes('Bandeng'))).toBe(true);
    });
  });
});
