import { eq } from 'drizzle-orm';

import { env } from '../../src/config/env';
import { AgencyType, UserRole, UserStatus } from '../../src/constants';
import type { Database } from '../../src/db/client';
import { agencies, users } from '../../src/db/schema';
import { generateUuid } from '../../src/lib/crypto';
import { passwordService } from '../../src/lib/password.service';
import type { TestAppContext } from './test-app';

export const E2E_PASSWORD = 'E2eTestPass123!';

export const VILLAGE_UJUNGGAGAK = '11111111-1111-4111-8111-111111111101';
export const VILLAGE_UJUNGALANG = '11111111-1111-4111-8111-111111111102';
export const VILLAGE_PANIKEL = '11111111-1111-4111-8111-111111111103';
export const VILLAGE_KLACES = '11111111-1111-4111-8111-111111111104';

export const AGENCY_PDAM = '33333333-3333-4333-8333-333333333301';
export const AGENCY_BPBD = '33333333-3333-4333-8333-333333333302';
export const AGENCY_DINAS_SOSIAL = '33333333-3333-4333-8333-333333333303';

export const SEED_COMMODITY_IKAN_BANDENG = 'b1000000-0000-4000-8000-000000000001';

export const E2E_USER_IDS = {
  adminDesaUjungalang: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
  adminDesaPanikel: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002',
  kaderDesaUjungalang: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003',
} as const;

export const E2E_EMAILS = {
  adminDesaUjungalang: 'e2e.admin.ujungalang@test.local',
  adminDesaPanikel: 'e2e.admin.panikel@test.local',
  kaderDesaUjungalang: 'e2e.kader.ujungalang@test.local',
} as const;

export type E2eTokens = {
  adminKecamatan: string;
  adminDesaUjungalang: string;
  adminDesaPanikel: string;
  kaderDesaUjungalang: string;
};

const E2E_USERS = [
  {
    id: E2E_USER_IDS.adminDesaUjungalang,
    email: E2E_EMAILS.adminDesaUjungalang,
    fullName: 'E2E Admin Desa Ujungalang',
    role: UserRole.ADMIN_DESA,
    villageId: VILLAGE_UJUNGALANG,
  },
  {
    id: E2E_USER_IDS.adminDesaPanikel,
    email: E2E_EMAILS.adminDesaPanikel,
    fullName: 'E2E Admin Desa Panikel',
    role: UserRole.ADMIN_DESA,
    villageId: VILLAGE_PANIKEL,
  },
  {
    id: E2E_USER_IDS.kaderDesaUjungalang,
    email: E2E_EMAILS.kaderDesaUjungalang,
    fullName: 'E2E Kader Desa Ujungalang',
    role: UserRole.KADER_DESA,
    villageId: VILLAGE_UJUNGALANG,
  },
] as const;

export const seedAdminKecamatan = async (db: Database): Promise<void> => {
  const existing = await db.select().from(users).where(eq(users.email, env.SEED_ADMIN_EMAIL)).limit(1);

  if (existing.length > 0) {
    return;
  }

  const passwordHash = await passwordService.hashPassword(env.SEED_ADMIN_PASSWORD);

  await db.insert(users).values({
    id: generateUuid(),
    email: env.SEED_ADMIN_EMAIL,
    passwordHash,
    fullName: 'E2E Administrator Kecamatan',
    phone: '0800000000',
    role: UserRole.ADMIN_KECAMATAN,
    status: UserStatus.ACTIVE,
  });
};

export const seedE2eUsers = async (db: Database): Promise<void> => {
  const passwordHash = await passwordService.hashPassword(E2E_PASSWORD);

  for (const user of E2E_USERS) {
    const existing = await db.select().from(users).where(eq(users.email, user.email)).limit(1);

    if (existing.length > 0) {
      continue;
    }

    await db.insert(users).values({
      id: user.id,
      email: user.email,
      passwordHash,
      fullName: user.fullName,
      phone: '081234567890',
      role: user.role,
      status: UserStatus.ACTIVE,
      villageId: user.villageId,
    });
  }
};

export const seedE2eAgencies = async (db: Database): Promise<void> => {
  const existing = await db.select().from(agencies).where(eq(agencies.id, AGENCY_DINAS_SOSIAL)).limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(agencies).values({
    id: AGENCY_DINAS_SOSIAL,
    name: 'Dinas Sosial E2E',
    agencyType: AgencyType.DINAS_SOSIAL,
    email: 'dinas.sosial@e2e.test',
    phone: '08123000003',
    isActive: true,
  });
};

export const seedE2eData = async (db: Database): Promise<void> => {
  await seedAdminKecamatan(db);
  await seedE2eUsers(db);
  await seedE2eAgencies(db);
};

const login = async (app: TestAppContext['app'], email: string, password: string): Promise<string> => {
  const response = await app.request(`${env.API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = (await response.json()) as { data?: { accessToken?: string } };

  if (!response.ok || !body.data?.accessToken) {
    throw new Error(`E2E login failed for ${email}: ${response.status} ${JSON.stringify(body)}`);
  }

  return body.data.accessToken;
};

export const getE2eTokens = async (context: TestAppContext): Promise<E2eTokens> => {
  const [adminKecamatan, adminDesaUjungalang, adminDesaPanikel, kaderDesaUjungalang] = await Promise.all([
    login(context.app, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD),
    login(context.app, E2E_EMAILS.adminDesaUjungalang, E2E_PASSWORD),
    login(context.app, E2E_EMAILS.adminDesaPanikel, E2E_PASSWORD),
    login(context.app, E2E_EMAILS.kaderDesaUjungalang, E2E_PASSWORD),
  ]);

  return {
    adminKecamatan,
    adminDesaUjungalang,
    adminDesaPanikel,
    kaderDesaUjungalang,
  };
};
