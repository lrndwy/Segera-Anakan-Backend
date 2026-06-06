import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { env } from '../../../src/config/env';
import { BookingStatus, PaymentStatus } from '../../../src/constants';
import { BoatAssignmentService } from '../../../src/modules/tourism/boat-assignment.service';
import { assertErrorEnvelope, assertSuccessEnvelope } from '../../helpers/assertions';
import { runMigrations } from '../../helpers/migrate';
import { closeTestApp, createTestApp, type TestAppContext } from '../../helpers/test-app';
import {
  TEST_PASSWORD,
  VILLAGE_UJUNGGAGAK,
  VILLAGE_UJUNGALANG,
  getTestTokens,
  seedTestUsers,
  type TestTokens,
} from '../../helpers/test-users';
import {
  countTourismAuditLogs,
  createTestPaymentFile,
  getBoatAssignments,
  getBoatOwnerByName,
  getBookingById,
  getDestinationById,
  getLatestBookingPayment,
  resetTourismTestData,
} from '../../helpers/tourism-db';
import {
  createBoatOwner,
  createBooking,
  createDestination,
  deleteDestination,
  submitBookingPayment,
  updateDestination,
  verifyBookingPayment,
} from '../../helpers/tourism-http';

const defaultDestinationInput = (villageId: string, name: string) => ({
  villageId,
  name,
  description: 'Destinasi wisata untuk integration test',
  pricePerPerson: 100_000,
  capacityPerDay: 100,
  maxPeoplePerBooking: 20,
});

const defaultBookingInput = (destinationId: string, bookingDate: string, totalPeople = 4) => ({
  destinationId,
  customerName: 'Budi Santoso',
  customerEmail: 'budi@example.com',
  customerPhone: '081234567890',
  bookingDate,
  totalPeople,
});

describe('Tourism Integration', () => {
  let context: TestAppContext;
  let tokens: TestTokens;

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
    vi.restoreAllMocks();
    await resetTourismTestData(context.db);
  });

  describe('Destination CRUD', () => {
    it('ADMIN_KECAMATAN — CRUD berhasil', async () => {
      const createResult = await createDestination(
        context.app,
        tokens.adminKecamatan,
        defaultDestinationInput(VILLAGE_UJUNGGAGAK, 'Pantai Kecamatan'),
      );

      expect(createResult.response.status).toBe(201);
      assertSuccessEnvelope(createResult.body as Record<string, unknown>);

      const destinationId = (createResult.body as { data: { id: string } }).data.id;

      const updateResult = await updateDestination(context.app, tokens.adminKecamatan, destinationId, {
        name: 'Pantai Kecamatan Updated',
      });

      expect(updateResult.response.status).toBe(200);
      expect((updateResult.body as { data: { name: string } }).data.name).toBe('Pantai Kecamatan Updated');

      const getResponse = await context.app.request(`${env.API_PREFIX}/destinations/${destinationId}`);
      expect(getResponse.status).toBe(200);

      const deleteResult = await deleteDestination(context.app, tokens.adminKecamatan, destinationId);
      expect(deleteResult.response.status).toBe(200);

      const deleted = await getDestinationById(context.db, destinationId);
      expect(deleted?.deletedAt).not.toBeNull();

      const getAfterDelete = await context.app.request(`${env.API_PREFIX}/destinations/${destinationId}`);
      expect(getAfterDelete.status).toBe(404);
    });

    it('ADMIN_DESA — CRUD desa sendiri berhasil', async () => {
      const createResult = await createDestination(
        context.app,
        tokens.adminDesaUjunggagak,
        defaultDestinationInput(VILLAGE_UJUNGGAGAK, 'Pantai Desa'),
      );

      expect(createResult.response.status).toBe(201);

      const destinationId = (createResult.body as { data: { id: string } }).data.id;

      const updateResult = await updateDestination(context.app, tokens.adminDesaUjunggagak, destinationId, {
        description: 'Deskripsi diperbarui admin desa',
      });

      expect(updateResult.response.status).toBe(200);

      const deleteResult = await deleteDestination(context.app, tokens.adminDesaUjunggagak, destinationId);
      expect(deleteResult.response.status).toBe(200);
    });

    it('ownership — ADMIN_DESA desa lain mendapat 403 saat update', async () => {
      const createResult = await createDestination(
        context.app,
        tokens.adminDesaUjunggagak,
        defaultDestinationInput(VILLAGE_UJUNGGAGAK, 'Pantai Milik Ujunggagak'),
      );

      const destinationId = (createResult.body as { data: { id: string } }).data.id;

      const updateResult = await updateDestination(context.app, tokens.adminDesaUjungalang, destinationId, {
        name: 'Percobaan akses desa lain',
      });

      expect(updateResult.response.status).toBe(403);
      assertErrorEnvelope(updateResult.body as Record<string, unknown>);
    });

    it('ownership — ADMIN_DESA desa lain mendapat 403 saat delete', async () => {
      const createResult = await createDestination(
        context.app,
        tokens.adminDesaUjunggagak,
        defaultDestinationInput(VILLAGE_UJUNGGAGAK, 'Pantai Delete Test'),
      );

      const destinationId = (createResult.body as { data: { id: string } }).data.id;

      const deleteResult = await deleteDestination(context.app, tokens.adminDesaUjungalang, destinationId);

      expect(deleteResult.response.status).toBe(403);
      assertErrorEnvelope(deleteResult.body as Record<string, unknown>);
    });
  });

  describe('Booking Flow', () => {
    const setupTourismFixtures = async () => {
      const destinationResult = await createDestination(
        context.app,
        tokens.adminDesaUjunggagak,
        defaultDestinationInput(VILLAGE_UJUNGGAGAK, 'Snorkeling Point'),
      );
      const destinationId = (destinationResult.body as { data: { id: string } }).data.id;

      await createBoatOwner(context.app, tokens.adminDesaUjunggagak, {
        villageId: VILLAGE_UJUNGGAGAK,
        fullName: 'Nelayan Flow',
        phone: '081111111001',
        boatName: 'Boat Flow',
        boatCapacity: 10,
      });

      return destinationId;
    };

    it('flow lengkap — booking, payment, verify, assign boat, audit log', async () => {
      const destinationId = await setupTourismFixtures();
      const fileId = await createTestPaymentFile(context.db);

      const bookingResult = await createBooking(
        context.app,
        defaultBookingInput(destinationId, '2026-08-01', 4),
      );

      expect(bookingResult.response.status).toBe(201);
      const bookingId = (bookingResult.body as { data: { bookingId: string } }).data.bookingId;

      let booking = await getBookingById(context.db, bookingId);
      expect(booking?.status).toBe(BookingStatus.PENDING_PAYMENT);
      expect(await countTourismAuditLogs(context.db, 'CREATE_BOOKING', bookingId)).toBe(1);

      const paymentResult = await submitBookingPayment(context.app, {
        bookingId,
        fileId,
        senderName: 'Budi Santoso',
      });

      expect(paymentResult.response.status).toBe(201);
      const payment = await getLatestBookingPayment(context.db, bookingId);
      expect(payment).not.toBeNull();
      expect(payment?.paymentStatus).toBe(PaymentStatus.PENDING);

      booking = await getBookingById(context.db, bookingId);
      expect(booking?.status).toBe(BookingStatus.WAITING_VERIFICATION);

      const verifyResult = await verifyBookingPayment(context.app, tokens.adminDesaUjunggagak, bookingId);
      expect(verifyResult.response.status).toBe(200);

      booking = await getBookingById(context.db, bookingId);
      expect(booking?.status).toBe(BookingStatus.CONFIRMED);

      const verifiedPayment = await getLatestBookingPayment(context.db, bookingId);
      expect(verifiedPayment?.paymentStatus).toBe(PaymentStatus.VERIFIED);

      const assignments = await getBoatAssignments(context.db, bookingId);
      expect(assignments.length).toBeGreaterThan(0);

      expect(await countTourismAuditLogs(context.db, 'VERIFY_BOOKING_PAYMENT', bookingId)).toBe(1);
      expect(await countTourismAuditLogs(context.db, 'ASSIGN_BOAT')).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Boat Rotation', () => {
    const setupRotationFixtures = async () => {
      const destinationResult = await createDestination(
        context.app,
        tokens.adminDesaUjunggagak,
        defaultDestinationInput(VILLAGE_UJUNGGAGAK, 'Rotasi Perahu'),
      );
      const destinationId = (destinationResult.body as { data: { id: string } }).data.id;

      for (const boat of [
        { fullName: 'Kapten A', phone: '081111111101', boatName: 'Boat A', boatCapacity: 10 },
        { fullName: 'Kapten B', phone: '081111111102', boatName: 'Boat B', boatCapacity: 10 },
        { fullName: 'Kapten C', phone: '081111111103', boatName: 'Boat C', boatCapacity: 10 },
      ]) {
        const result = await createBoatOwner(context.app, tokens.adminDesaUjunggagak, {
          villageId: VILLAGE_UJUNGGAGAK,
          ...boat,
        });
        expect(result.response.status).toBe(201);
      }

      const boatA = await getBoatOwnerByName(context.db, 'Boat A');
      const boatB = await getBoatOwnerByName(context.db, 'Boat B');
      const boatC = await getBoatOwnerByName(context.db, 'Boat C');

      return { destinationId, boatA, boatB, boatC };
    };

    const completeBooking = async (destinationId: string, bookingDate: string) => {
      const fileId = await createTestPaymentFile(context.db);
      const bookingResult = await createBooking(context.app, defaultBookingInput(destinationId, bookingDate, 4));
      const bookingId = (bookingResult.body as { data: { bookingId: string } }).data.bookingId;

      await submitBookingPayment(context.app, { bookingId, fileId, senderName: 'Tamu Wisata' });
      await verifyBookingPayment(context.app, tokens.adminDesaUjunggagak, bookingId);

      return bookingId;
    };

    it('rotasi Boat A → B → C → A', async () => {
      const { destinationId, boatA, boatB, boatC } = await setupRotationFixtures();

      const booking1 = await completeBooking(destinationId, '2026-09-01');
      const booking2 = await completeBooking(destinationId, '2026-09-02');
      const booking3 = await completeBooking(destinationId, '2026-09-03');
      const booking4 = await completeBooking(destinationId, '2026-09-04');

      const assignment1 = await getBoatAssignments(context.db, booking1);
      const assignment2 = await getBoatAssignments(context.db, booking2);
      const assignment3 = await getBoatAssignments(context.db, booking3);
      const assignment4 = await getBoatAssignments(context.db, booking4);

      expect(assignment1[0]?.boatOwnerId).toBe(boatA?.id);
      expect(assignment2[0]?.boatOwnerId).toBe(boatB?.id);
      expect(assignment3[0]?.boatOwnerId).toBe(boatC?.id);
      expect(assignment4[0]?.boatOwnerId).toBe(boatA?.id);
    });
  });

  describe('Transaction', () => {
    it('boat assignment gagal — booking verification di-rollback', async () => {
      const destinationResult = await createDestination(
        context.app,
        tokens.adminDesaUjunggagak,
        defaultDestinationInput(VILLAGE_UJUNGGAGAK, 'Rollback Test'),
      );
      const destinationId = (destinationResult.body as { data: { id: string } }).data.id;
      const fileId = await createTestPaymentFile(context.db);

      const bookingResult = await createBooking(context.app, defaultBookingInput(destinationId, '2026-10-01', 4));
      const bookingId = (bookingResult.body as { data: { bookingId: string } }).data.bookingId;

      await submitBookingPayment(context.app, { bookingId, fileId, senderName: 'Budi Santoso' });

      vi.spyOn(BoatAssignmentService.prototype, 'assignForBooking').mockRejectedValueOnce(
        new Error('Simulated boat assignment failure'),
      );

      const verifyResult = await verifyBookingPayment(context.app, tokens.adminDesaUjunggagak, bookingId);
      expect(verifyResult.response.status).toBe(500);

      const booking = await getBookingById(context.db, bookingId);
      const payment = await getLatestBookingPayment(context.db, bookingId);
      const assignments = await getBoatAssignments(context.db, bookingId);

      expect(booking?.status).toBe(BookingStatus.WAITING_VERIFICATION);
      expect(payment?.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(assignments).toHaveLength(0);
      expect(await countTourismAuditLogs(context.db, 'VERIFY_BOOKING_PAYMENT', bookingId)).toBe(0);
      expect(await countTourismAuditLogs(context.db, 'ASSIGN_BOAT')).toBe(0);
    });
  });

  describe('Audit Log', () => {
    it('CREATE_BOOKING, VERIFY_BOOKING_PAYMENT, ASSIGN_BOAT tercatat', async () => {
      const destinationResult = await createDestination(
        context.app,
        tokens.adminDesaUjunggagak,
        defaultDestinationInput(VILLAGE_UJUNGGAGAK, 'Audit Log Test'),
      );
      const destinationId = (destinationResult.body as { data: { id: string } }).data.id;

      await createBoatOwner(context.app, tokens.adminDesaUjunggagak, {
        villageId: VILLAGE_UJUNGGAGAK,
        fullName: 'Kapten Audit',
        phone: '081111111201',
        boatName: 'Boat Audit',
        boatCapacity: 10,
      });

      const fileId = await createTestPaymentFile(context.db);
      const bookingResult = await createBooking(context.app, defaultBookingInput(destinationId, '2026-11-01', 4));
      const bookingId = (bookingResult.body as { data: { bookingId: string } }).data.bookingId;

      await submitBookingPayment(context.app, { bookingId, fileId, senderName: 'Budi Santoso' });
      await verifyBookingPayment(context.app, tokens.adminDesaUjunggagak, bookingId);

      expect(await countTourismAuditLogs(context.db, 'CREATE_BOOKING', bookingId)).toBe(1);
      expect(await countTourismAuditLogs(context.db, 'VERIFY_BOOKING_PAYMENT', bookingId)).toBe(1);
      expect(await countTourismAuditLogs(context.db, 'ASSIGN_BOAT')).toBeGreaterThanOrEqual(1);
    });
  });
});
