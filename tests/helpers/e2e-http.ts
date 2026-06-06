import { env } from '../../src/config/env';
import type { TestAppContext } from './test-app';
import { authHeader } from './assertions';

type JsonBody = Record<string, unknown>;

const parseJson = async (response: Response): Promise<JsonBody> => (await response.json()) as JsonBody;

export const login = async (app: TestAppContext['app'], email: string, password: string) => {
  const response = await app.request(`${env.API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  return { response, body: await parseJson(response) };
};

export const refreshToken = async (app: TestAppContext['app'], refreshTokenValue: string) => {
  const response = await app.request(`${env.API_PREFIX}/auth/refresh-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });

  return { response, body: await parseJson(response) };
};

export const logout = async (app: TestAppContext['app'], accessToken: string, refreshTokenValue: string) => {
  const response = await app.request(`${env.API_PREFIX}/auth/logout`, {
    method: 'POST',
    headers: authHeader(accessToken),
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });

  return { response, body: await parseJson(response) };
};

export const createUser = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/users`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const updateVillage = async (app: TestAppContext['app'], token: string, villageId: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/villages/${villageId}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const updateVillageQris = async (app: TestAppContext['app'], token: string, villageId: string, fileId: string) => {
  const response = await app.request(`${env.API_PREFIX}/villages/${villageId}/qris`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ fileId }),
  });

  return { response, body: await parseJson(response) };
};

export const uploadFile = async (app: TestAppContext['app'], token: string, fileName = 'test.jpg') => {
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const form = new FormData();
  form.append('file', new Blob([jpegHeader], { type: 'image/jpeg' }), fileName);

  const response = await app.request(`${env.API_PREFIX}/files/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  return { response, body: await parseJson(response) };
};

export const manualRobOverride = async (app: TestAppContext['app'], token: string, status: string, reason: string) => {
  const response = await app.request(`${env.API_PREFIX}/rob/manual-override`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ status, reason }),
  });

  return { response, body: await parseJson(response) };
};

export const testRobWebhook = async (app: TestAppContext['app'], token: string) => {
  const response = await app.request(`${env.API_PREFIX}/rob/webhook/test`, {
    method: 'POST',
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const createWaterAsset = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/water-assets`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const createWaterReport = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/water-reports`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const createDestination = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/destinations`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const createBoatOwner = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/boat-owners`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const createBooking = async (app: TestAppContext['app'], input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const submitBookingPayment = async (app: TestAppContext['app'], input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/booking-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const verifyBookingPayment = async (app: TestAppContext['app'], token: string, bookingId: string) => {
  const response = await app.request(`${env.API_PREFIX}/bookings/${bookingId}/verify-payment`, {
    method: 'PATCH',
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const createFisherman = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/fishermen`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const createInventory = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-inventory`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const createCommodityOrder = async (app: TestAppContext['app'], input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const submitCommodityPayment = async (app: TestAppContext['app'], input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const verifyCommodityPayment = async (app: TestAppContext['app'], token: string, orderId: string) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-orders/${orderId}/verify-payment`, {
    method: 'PATCH',
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const rejectCommodityPayment = async (app: TestAppContext['app'], token: string, orderId: string, notes: string) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-orders/${orderId}/reject-payment`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ notes }),
  });

  return { response, body: await parseJson(response) };
};

export const createManifest = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/manifests`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const addManifestItem = async (app: TestAppContext['app'], token: string, manifestId: string, commodityOrderId: string) => {
  const response = await app.request(`${env.API_PREFIX}/manifests/${manifestId}/items`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ commodityOrderId }),
  });

  return { response, body: await parseJson(response) };
};

export const departManifest = async (app: TestAppContext['app'], token: string, manifestId: string) => {
  const response = await app.request(`${env.API_PREFIX}/manifests/${manifestId}/depart`, {
    method: 'PATCH',
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const completeManifest = async (app: TestAppContext['app'], token: string, manifestId: string) => {
  const response = await app.request(`${env.API_PREFIX}/manifests/${manifestId}/complete`, {
    method: 'PATCH',
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const createAgency = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/agencies`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const sendAgencyEmail = async (app: TestAppContext['app'], token: string, agencyId: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/agencies/${agencyId}/send-email`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const sendAgencyWhatsApp = async (app: TestAppContext['app'], token: string, agencyId: string, message: string) => {
  const response = await app.request(`${env.API_PREFIX}/agencies/${agencyId}/send-whatsapp`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ message }),
  });

  return { response, body: await parseJson(response) };
};

export const createSetting = async (app: TestAppContext['app'], token: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/settings`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const updateSetting = async (app: TestAppContext['app'], token: string, key: string, input: Record<string, unknown>) => {
  const response = await app.request(`${env.API_PREFIX}/settings/${key}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await parseJson(response) };
};

export const getSetting = async (app: TestAppContext['app'], token: string, key: string) => {
  const response = await app.request(`${env.API_PREFIX}/settings/${key}`, {
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const deleteSetting = async (app: TestAppContext['app'], token: string, key: string) => {
  const response = await app.request(`${env.API_PREFIX}/settings/${key}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const getAuditLogSummary = async (app: TestAppContext['app'], token: string) => {
  const response = await app.request(`${env.API_PREFIX}/audit-logs/summary`, {
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const exportAuditLogs = async (app: TestAppContext['app'], token: string) => {
  const response = await app.request(`${env.API_PREFIX}/audit-logs/export`, {
    headers: authHeader(token),
  });

  return { response, text: await response.text() };
};

export const getAuditLogDetail = async (app: TestAppContext['app'], token: string, id: string) => {
  const response = await app.request(`${env.API_PREFIX}/audit-logs/${id}`, {
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const getInventoryMovements = async (app: TestAppContext['app'], token: string, inventoryId: string) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-inventory/${inventoryId}/movements`, {
    headers: authHeader(token),
  });

  return { response, body: await parseJson(response) };
};

export const getPublicRobStatus = async (app: TestAppContext['app']) => {
  const response = await app.request(`${env.API_PREFIX}/rob-status`);
  return { response, body: await parseJson(response) };
};

export const getPublicDestinations = async (app: TestAppContext['app']) => {
  const response = await app.request(`${env.API_PREFIX}/destinations`);
  return { response, body: await parseJson(response) };
};

export const getPublicWaterStatus = async (app: TestAppContext['app']) => {
  const response = await app.request(`${env.API_PREFIX}/water-status`);
  return { response, body: await parseJson(response) };
};

export const createTestPaymentFile = async (db: import('../../src/db/client').Database, bucket = 'e2e-test-files'): Promise<string> => {
  const { generateUuid } = await import('../../src/lib/crypto');
  const { files } = await import('../../src/db/schema');

  const id = generateUuid();

  await db.insert(files).values({
    id,
    bucket,
    objectName: `payments/${id}.jpg`,
    originalName: 'payment-proof.jpg',
    mimeType: 'image/jpeg',
    size: 1024,
    url: `http://localhost:9000/${bucket}/payments/${id}.jpg`,
  });

  return id;
};
