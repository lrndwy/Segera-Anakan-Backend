import { env } from '../../src/config/env';
import type { TestAppContext } from './test-app';
import { authHeader } from './assertions';

type LoginResult = {
  accessToken: string;
  refreshToken: string;
};

export const loginAs = async (
  app: TestAppContext['app'],
  email: string,
  password: string,
): Promise<LoginResult> => {
  const response = await app.request(`${env.API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const body = (await response.json()) as {
    data?: { accessToken: string; refreshToken: string };
  };

  if (!response.ok || !body.data) {
    throw new Error(`Login failed for ${email}: ${response.status}`);
  }

  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
  };
};

export const createDestination = async (
  app: TestAppContext['app'],
  token: string,
  input: {
    villageId: string;
    name: string;
    description: string;
    pricePerPerson: number;
    capacityPerDay: number;
    maxPeoplePerBooking: number;
  },
) => {
  const response = await app.request(`${env.API_PREFIX}/destinations`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  const body = await response.json();
  return { response, body };
};

export const updateDestination = async (
  app: TestAppContext['app'],
  token: string,
  destinationId: string,
  input: Record<string, unknown>,
) => {
  const response = await app.request(`${env.API_PREFIX}/destinations/${destinationId}`, {
    method: 'PATCH',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  const body = await response.json();
  return { response, body };
};

export const deleteDestination = async (app: TestAppContext['app'], token: string, destinationId: string) => {
  const response = await app.request(`${env.API_PREFIX}/destinations/${destinationId}`, {
    method: 'DELETE',
    headers: authHeader(token),
  });

  const body = await response.json();
  return { response, body };
};

export const createBoatOwner = async (
  app: TestAppContext['app'],
  token: string,
  input: {
    villageId: string;
    fullName: string;
    phone: string;
    boatName: string;
    boatCapacity: number;
  },
) => {
  const response = await app.request(`${env.API_PREFIX}/boat-owners`, {
    method: 'POST',
    headers: authHeader(token),
    body: JSON.stringify(input),
  });

  const body = await response.json();
  return { response, body };
};

export const createBooking = async (
  app: TestAppContext['app'],
  input: {
    destinationId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    bookingDate: string;
    totalPeople: number;
  },
) => {
  const response = await app.request(`${env.API_PREFIX}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const body = await response.json();
  return { response, body };
};

export const submitBookingPayment = async (
  app: TestAppContext['app'],
  input: { bookingId: string; fileId: string; senderName: string },
) => {
  const response = await app.request(`${env.API_PREFIX}/booking-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const body = await response.json();
  return { response, body };
};

export const verifyBookingPayment = async (app: TestAppContext['app'], token: string, bookingId: string) => {
  const response = await app.request(`${env.API_PREFIX}/bookings/${bookingId}/verify-payment`, {
    method: 'PATCH',
    headers: authHeader(token),
  });

  const body = await response.json();
  return { response, body };
};
