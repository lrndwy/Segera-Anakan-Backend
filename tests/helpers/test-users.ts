import { eq } from 'drizzle-orm';

import { env } from '../../src/config/env';
import { UserRole, UserStatus } from '../../src/constants';
import type { Database } from '../../src/db/client';
import { users } from '../../src/db/schema';
import { generateUuid } from '../../src/lib/crypto';
import { passwordService } from '../../src/lib/password.service';
import type { TestAppContext } from './test-app';

export const TEST_PASSWORD = 'TestPass123!';

export const INACTIVE_USER_EMAIL = 'inactive.user@test.local';
export const INACTIVE_USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa04';

export const VILLAGE_UJUNGGAGAK = '11111111-1111-4111-8111-111111111101';
export const VILLAGE_UJUNGALANG = '11111111-1111-4111-8111-111111111102';

export const TEST_USER_IDS = [
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa03',
] as const;

export type TestTokens = {
  adminKecamatan: string;
  adminDesaUjunggagak: string;
  adminDesaUjungalang: string;
  kaderDesa: string;
};

const TEST_USERS = [
  {
    id: TEST_USER_IDS[0],
    email: 'admin.desa.ujunggagak@test.local',
    fullName: 'Admin Desa Ujunggagak',
    role: UserRole.ADMIN_DESA,
    villageId: VILLAGE_UJUNGGAGAK,
  },
  {
    id: TEST_USER_IDS[1],
    email: 'admin.desa.ujungalang@test.local',
    fullName: 'Admin Desa Ujungalang',
    role: UserRole.ADMIN_DESA,
    villageId: VILLAGE_UJUNGALANG,
  },
  {
    id: TEST_USER_IDS[2],
    email: 'kader.desa@test.local',
    fullName: 'Kader Desa Ujunggagak',
    role: UserRole.KADER_DESA,
    villageId: VILLAGE_UJUNGGAGAK,
  },
] as const;

export const seedTestUsers = async (db: Database): Promise<void> => {
  const passwordHash = await passwordService.hashPassword(TEST_PASSWORD);

  for (const user of TEST_USERS) {
    const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1);

    if (existing.length > 0) {
      continue;
    }

    await db.insert(users).values({
      id: user.id,
      email: user.email,
      passwordHash,
      fullName: user.fullName,
      phone: '081111111111',
      role: user.role,
      status: UserStatus.ACTIVE,
      villageId: user.villageId,
    });
  }
};

const login = async (app: TestAppContext['app'], email: string, password: string): Promise<string> => {
  const response = await app.request(`${env.API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = (await response.json()) as { data?: { accessToken?: string } };

  if (!response.ok || !body.data?.accessToken) {
    throw new Error(`Login failed for ${email}: ${response.status} ${JSON.stringify(body)}`);
  }

  return body.data.accessToken;
};

export const getTestTokens = async (context: TestAppContext): Promise<TestTokens> => {
  const [adminKecamatan, adminDesaUjunggagak, adminDesaUjungalang, kaderDesa] = await Promise.all([
    login(context.app, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD),
    login(context.app, 'admin.desa.ujunggagak@test.local', TEST_PASSWORD),
    login(context.app, 'admin.desa.ujungalang@test.local', TEST_PASSWORD),
    login(context.app, 'kader.desa@test.local', TEST_PASSWORD),
  ]);

  return {
    adminKecamatan,
    adminDesaUjunggagak,
    adminDesaUjungalang,
    kaderDesa,
  };
};
