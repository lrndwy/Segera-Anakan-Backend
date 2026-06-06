import { expect } from 'vitest';

export const assertSuccessEnvelope = (body: Record<string, unknown>, withData = true) => {
  expect(body.success).toBe(true);
  expect(typeof body.message).toBe('string');
  expect(body.message).not.toHaveLength(0);

  if (withData) {
    expect(body.data).toBeDefined();
  }
};

export const assertErrorEnvelope = (body: Record<string, unknown>) => {
  expect(body.success).toBe(false);
  expect(typeof body.message).toBe('string');
  expect(body.message).not.toHaveLength(0);
};

export const assertPaginatedEnvelope = (body: Record<string, unknown>) => {
  assertSuccessEnvelope(body);
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.meta).toMatchObject({
    page: expect.any(Number),
    limit: expect.any(Number),
    total_items: expect.any(Number),
    total_pages: expect.any(Number),
  });
};

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});
