import { env } from '../../src/config/env';
import type { TestAppContext } from './test-app';
import { authHeader } from './assertions';

export const createFisherman = async (
  app: TestAppContext['app'],
  token: string,
  input: { villageId: string; fullName: string; phone?: string },
) => {
  const response = await app.request(`${env.API_PREFIX}/fishermen`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await response.json() };
};

export const createInventory = async (
  app: TestAppContext['app'],
  token: string,
  input: { fishermanId: string; commodityId: string; availableWeightKg: number; pricePerKg: number },
) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-inventory`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await response.json() };
};

export const createCommodityOrder = async (
  app: TestAppContext['app'],
  input: {
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    items: Array<{ inventoryId: string; quantityKg: number }>;
  },
) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return { response, body: await response.json() };
};

export const submitCommodityPayment = async (
  app: TestAppContext['app'],
  input: { commodityOrderId: string; fileId: string; senderName: string },
) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  return { response, body: await response.json() };
};

export const verifyCommodityPayment = async (app: TestAppContext['app'], token: string, orderId: string) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-orders/${orderId}/verify-payment`, {
    method: 'PATCH',
    headers: authHeader(token),
  });

  return { response, body: await response.json() };
};

export const rejectCommodityPayment = async (
  app: TestAppContext['app'],
  token: string,
  orderId: string,
  notes: string,
) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-orders/${orderId}/reject-payment`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify({ notes }),
  });

  return { response, body: await response.json() };
};

export const createManifest = async (
  app: TestAppContext['app'],
  token: string,
  input: { manifestDate: string; villageId?: string },
) => {
  const response = await app.request(`${env.API_PREFIX}/manifests`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  return { response, body: await response.json() };
};

export const addManifestItem = async (
  app: TestAppContext['app'],
  token: string,
  manifestId: string,
  commodityOrderId: string,
) => {
  const response = await app.request(`${env.API_PREFIX}/manifests/${manifestId}/items`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify({ commodityOrderId }),
  });

  return { response, body: await response.json() };
};

export const departManifest = async (app: TestAppContext['app'], token: string, manifestId: string) => {
  const response = await app.request(`${env.API_PREFIX}/manifests/${manifestId}/depart`, {
    method: 'PATCH',
    headers: authHeader(token),
  });

  return { response, body: await response.json() };
};

export const completeManifest = async (app: TestAppContext['app'], token: string, manifestId: string) => {
  const response = await app.request(`${env.API_PREFIX}/manifests/${manifestId}/complete`, {
    method: 'PATCH',
    headers: authHeader(token),
  });

  return { response, body: await response.json() };
};

export const getInventoryMovements = async (app: TestAppContext['app'], token: string, inventoryId: string) => {
  const response = await app.request(`${env.API_PREFIX}/commodity-inventory/${inventoryId}/movements`, {
    headers: authHeader(token),
  });

  return { response, body: await response.json() };
};
