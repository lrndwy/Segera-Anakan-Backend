import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { env } from '../../../src/config/env';
import { UserRole } from '../../../src/constants';
import { assertErrorEnvelope, assertSuccessEnvelope, authHeader } from '../../helpers/assertions';
import {
  countSessionsByRefreshToken,
  createExpiredRefreshToken,
  createValidRefreshTokenWithExpiredSession,
  findSessionByRefreshToken,
  getLatestAuthAuditLog,
  resetAuthTestData,
  seedInactiveUser,
} from '../../helpers/auth-db';
import { runMigrations } from '../../helpers/migrate';
import { closeTestApp, createTestApp, type TestAppContext } from '../../helpers/test-app';
import {
  INACTIVE_USER_EMAIL,
  TEST_PASSWORD,
  TEST_USER_IDS,
  VILLAGE_UJUNGGAGAK,
  seedTestUsers,
} from '../../helpers/test-users';

type LoginData = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    villageId: string | null;
  };
};

const login = async (app: TestAppContext['app'], email: string, password: string) => {
  const response = await app.request(`${env.API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = (await response.json()) as { success: boolean; data?: LoginData };

  return { response, body };
};

describe('Auth Integration', () => {
  let context: TestAppContext;
  const api = env.API_PREFIX;

  beforeAll(async () => {
    await runMigrations();
    context = await createTestApp();
    await seedTestUsers(context.db);
    await seedInactiveUser(context.db);
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  beforeEach(async () => {
    await resetAuthTestData(context.db);
  });

  describe('POST /auth/login', () => {
    it('happy path — ADMIN_KECAMATAN login berhasil', async () => {
      const { response, body } = await login(context.app, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);

      expect(response.status).toBe(201);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect(body.data?.user.role).toBe(UserRole.ADMIN_KECAMATAN);
      expect(body.data?.user.villageId).toBeNull();
      expect(body.data?.accessToken).toEqual(expect.any(String));
      expect(body.data?.refreshToken).toEqual(expect.any(String));
      expect(await findSessionByRefreshToken(context.db, body.data!.refreshToken)).not.toBeNull();
    });

    it('happy path — ADMIN_DESA login berhasil', async () => {
      const { response, body } = await login(context.app, 'admin.desa.ujunggagak@test.local', TEST_PASSWORD);

      expect(response.status).toBe(201);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect(body.data?.user.role).toBe(UserRole.ADMIN_DESA);
      expect(body.data?.user.villageId).toBe(VILLAGE_UJUNGGAGAK);
    });

    it('happy path — KADER_DESA login berhasil', async () => {
      const { response, body } = await login(context.app, 'kader.desa@test.local', TEST_PASSWORD);

      expect(response.status).toBe(201);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect(body.data?.user.role).toBe(UserRole.KADER_DESA);
      expect(body.data?.user.villageId).toBe(VILLAGE_UJUNGGAGAK);
    });

    it('invalid password — returns 401', async () => {
      const { response, body } = await login(context.app, env.SEED_ADMIN_EMAIL, 'WrongPassword123!');

      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('invalid email — returns 401', async () => {
      const { response, body } = await login(context.app, 'notfound@test.local', TEST_PASSWORD);

      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('inactive user — returns 403', async () => {
      const { response, body } = await login(context.app, INACTIVE_USER_EMAIL, TEST_PASSWORD);

      expect(response.status).toBe(403);
      assertErrorEnvelope(body as Record<string, unknown>);
    });
  });

  describe('POST /auth/refresh-token', () => {
    it('valid token — refresh berhasil', async () => {
      const loginResult = await login(context.app, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);
      const refreshToken = loginResult.body.data!.refreshToken;

      const response = await context.app.request(`${api}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const body = await response.json();

      expect(response.status).toBe(201);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect((body as { data: LoginData }).data.accessToken).toEqual(expect.any(String));
      expect((body as { data: LoginData }).data.refreshToken).toEqual(expect.any(String));
      expect(await findSessionByRefreshToken(context.db, (body as { data: LoginData }).data.refreshToken)).not.toBeNull();
    });

    it('invalid token — returns 401', async () => {
      const response = await context.app.request(`${api}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: 'invalid.refresh.token' }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('expired JWT — returns 401', async () => {
      const expiredToken = createExpiredRefreshToken(TEST_USER_IDS[0]);

      const response = await context.app.request(`${api}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: expiredToken }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('expired session — returns 401', async () => {
      const expiredSessionToken = await createValidRefreshTokenWithExpiredSession(context.db, TEST_USER_IDS[0]);

      const response = await context.app.request(`${api}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: expiredSessionToken }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });
  });

  describe('POST /auth/logout', () => {
    it('logout — menghapus user_sessions', async () => {
      const loginResult = await login(context.app, 'admin.desa.ujunggagak@test.local', TEST_PASSWORD);
      const { accessToken, refreshToken } = loginResult.body.data!;

      expect(await countSessionsByRefreshToken(context.db, refreshToken)).toBe(1);

      const response = await context.app.request(`${api}/auth/logout`, {
        method: 'POST',
        headers: authHeader(accessToken),
        body: JSON.stringify({ refreshToken }),
      });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true, message: 'Logout successful' });
      expect(await countSessionsByRefreshToken(context.db, refreshToken)).toBe(0);
    });
  });

  describe('GET /auth/me', () => {
    it('returns role and villageId for ADMIN_KECAMATAN', async () => {
      const loginResult = await login(context.app, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);

      const response = await context.app.request(`${api}/auth/me`, {
        headers: authHeader(loginResult.body.data!.accessToken),
      });
      const body = (await response.json()) as {
        data: { role: string; villageId: string | null; email: string };
      };

      expect(response.status).toBe(200);
      assertSuccessEnvelope(body as Record<string, unknown>);
      expect(body.data.role).toBe(UserRole.ADMIN_KECAMATAN);
      expect(body.data.villageId).toBeNull();
      expect(body.data.email).toBe(env.SEED_ADMIN_EMAIL);
    });

    it('returns role and villageId for ADMIN_DESA', async () => {
      const loginResult = await login(context.app, 'admin.desa.ujunggagak@test.local', TEST_PASSWORD);

      const response = await context.app.request(`${api}/auth/me`, {
        headers: authHeader(loginResult.body.data!.accessToken),
      });
      const body = (await response.json()) as {
        data: { role: string; villageId: string | null };
      };

      expect(response.status).toBe(200);
      expect(body.data.role).toBe(UserRole.ADMIN_DESA);
      expect(body.data.villageId).toBe(VILLAGE_UJUNGGAGAK);
    });

    it('returns role and villageId for KADER_DESA', async () => {
      const loginResult = await login(context.app, 'kader.desa@test.local', TEST_PASSWORD);

      const response = await context.app.request(`${api}/auth/me`, {
        headers: authHeader(loginResult.body.data!.accessToken),
      });
      const body = (await response.json()) as {
        data: { role: string; villageId: string | null };
      };

      expect(response.status).toBe(200);
      expect(body.data.role).toBe(UserRole.KADER_DESA);
      expect(body.data.villageId).toBe(VILLAGE_UJUNGGAGAK);
    });
  });

  describe('Audit Log', () => {
    it('LOGIN — tercatat di audit_logs', async () => {
      await login(context.app, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);

      const auditLog = await getLatestAuthAuditLog(context.db, 'LOGIN');

      expect(auditLog).not.toBeNull();
      expect(auditLog?.module).toBe('AUTH');
      expect(auditLog?.entityType).toBe('users');
      expect(auditLog?.entityId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('LOGOUT — tercatat di audit_logs', async () => {
      const loginResult = await login(context.app, 'kader.desa@test.local', TEST_PASSWORD);
      const { accessToken, refreshToken } = loginResult.body.data!;

      await context.app.request(`${api}/auth/logout`, {
        method: 'POST',
        headers: authHeader(accessToken),
        body: JSON.stringify({ refreshToken }),
      });

      const auditLog = await getLatestAuthAuditLog(context.db, 'LOGOUT');

      expect(auditLog).not.toBeNull();
      expect(auditLog?.module).toBe('AUTH');
      expect(auditLog?.entityType).toBe('user_sessions');
      expect(auditLog?.entityId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });
});
