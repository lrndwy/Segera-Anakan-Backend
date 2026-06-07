import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { env } from '../../src/config/env';
import {
  BookingStatus,
  CommodityOrderStatus,
  ManifestStatus,
  MovementType,
  PaymentStatus,
  RobStatus,
  UserRole,
  WaterStatus,
} from '../../src/constants';
import { CommodityInventoryRepository } from '../../src/modules/economy/commodity-inventory.repository';
import { CommodityOrderRepository } from '../../src/modules/economy/commodity-order.repository';
import { BmkgService } from '../../src/modules/rob/bmkg.service';
import { BoatAssignmentService } from '../../src/modules/tourism/boat-assignment.service';
import { assertErrorEnvelope, assertPaginatedEnvelope, assertSuccessEnvelope, authHeader } from '../helpers/assertions';
import {
  containsSensitiveAuditData,
  countAgencyNotificationLogs,
  countAuthAuditLogs,
  countEmailLogs,
  countManualOverrides,
  countNotificationLogs,
  countRobHistories,
  countWaterAlerts,
  countWebhookLogs,
  deactivateBoatOwnersInVillage,
  resetBookingsByDates,
  resetVillageTourismData,
  getCurrentRobStatus,
  getLatestAuditLogByAction,
  getManifestItemsByOrderId,
  getVillageById,
} from '../helpers/e2e-db';
import {
  addManifestItem,
  completeManifest,
  createAgency,
  createBooking,
  createBoatOwner,
  createCommodityOrder,
  createDestination,
  createFisherman,
  createInventory,
  createManifest,
  createSetting,
  createTestPaymentFile,
  createUser,
  createWaterAsset,
  createWaterReport,
  deleteSetting,
  departManifest,
  exportAuditLogs,
  getAuditLogDetail,
  getAuditLogSummary,
  getInventoryMovements,
  getPublicDestinations,
  getPublicRobStatus,
  getPublicWaterStatus,
  getSetting,
  login,
  logout,
  manualRobOverride,
  refreshToken,
  rejectCommodityPayment,
  sendAgencyEmail,
  sendAgencyWhatsApp,
  submitBookingPayment,
  submitCommodityPayment,
  testRobWebhook,
  updateSetting,
  updateVillage,
  updateVillageQris,
  uploadFile,
  verifyBookingPayment,
  verifyCommodityPayment,
} from '../helpers/e2e-http';
import {
  E2E_EMAILS,
  E2E_PASSWORD,
  SEED_COMMODITY_IKAN_BANDENG,
  VILLAGE_KLACES,
  VILLAGE_PANIKEL,
  VILLAGE_UJUNGALANG,
  getE2eTokens,
  seedE2eData,
  type E2eTokens,
} from '../helpers/e2e-seed';
import { findSessionByRefreshToken } from '../helpers/auth-db';
import { getBoatAssignments, getBookingById, getLatestBookingPayment } from '../helpers/tourism-db';
import { getInventoryById, getLatestOrderPayment, getManifestById, getOrderById, getStockMovements } from '../helpers/economy-db';
import { runMigrations } from '../helpers/migrate';
import { ensureTestDatabase } from '../helpers/ensure-test-database';
import { closeTestApp, createTestApp, type TestAppContext } from '../helpers/test-app';

describe('System E2E', () => {
  let context: TestAppContext;
  let tokens: E2eTokens;
  let customSettingKey = '';
  const api = env.API_PREFIX;

  beforeAll(async () => {
    await ensureTestDatabase();
    await runMigrations();
    context = await createTestApp();
    await seedE2eData(context.db);
    tokens = await getE2eTokens(context);
    customSettingKey = `E2E_CUSTOM_SETTING_${Date.now()}`;
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  describe('Phase 1 — Authentication', () => {
    it('login ADMIN_KECAMATAN — access token & refresh token', async () => {
      const { response, body } = await login(context.app, env.SEED_ADMIN_EMAIL, env.SEED_ADMIN_PASSWORD);

      expect(response.status).toBe(201);
      assertSuccessEnvelope(body);
      expect((body.data as { accessToken: string }).accessToken).toEqual(expect.any(String));
      expect((body.data as { refreshToken: string }).refreshToken).toEqual(expect.any(String));
    });

    it('login ADMIN_DESA — berhasil', async () => {
      const { response } = await login(context.app, E2E_EMAILS.adminDesaUjungalang, E2E_PASSWORD);
      expect(response.status).toBe(201);
    });

    it('login KADER_DESA — berhasil', async () => {
      const { response } = await login(context.app, E2E_EMAILS.kaderDesaUjungalang, E2E_PASSWORD);
      expect(response.status).toBe(201);
    });

    it('refresh token — token baru dibuat', async () => {
      const loginResult = await login(context.app, E2E_EMAILS.adminDesaUjungalang, E2E_PASSWORD);
      const oldAccess = (loginResult.body.data as { accessToken: string }).accessToken;
      const oldRefresh = (loginResult.body.data as { refreshToken: string }).refreshToken;

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const refreshResult = await refreshToken(context.app, oldRefresh);
      expect(refreshResult.response.status).toBe(201);
      assertSuccessEnvelope(refreshResult.body);

      const newAccess = (refreshResult.body.data as { accessToken: string }).accessToken;
      const newRefresh = (refreshResult.body.data as { refreshToken: string }).refreshToken;
      expect(newAccess).not.toBe(oldAccess);
      expect(newRefresh).toEqual(expect.any(String));
    });

    it('logout — session terhapus', async () => {
      const loginResult = await login(context.app, E2E_EMAILS.kaderDesaUjungalang, E2E_PASSWORD);
      const accessToken = (loginResult.body.data as { accessToken: string }).accessToken;
      const refresh = (loginResult.body.data as { refreshToken: string }).refreshToken;

      const logoutResult = await logout(context.app, accessToken, refresh);
      expect(logoutResult.response.status).toBe(200);
      expect(await findSessionByRefreshToken(context.db, refresh)).toBeNull();
    });

    it('audit log — LOGIN & LOGOUT tercatat', async () => {
      const beforeLogin = await countAuthAuditLogs(context.db, 'LOGIN');
      await login(context.app, E2E_EMAILS.adminDesaPanikel, E2E_PASSWORD);
      expect(await countAuthAuditLogs(context.db, 'LOGIN')).toBeGreaterThan(beforeLogin);

      const beforeLogout = await countAuthAuditLogs(context.db, 'LOGOUT');
      const loginResult = await login(context.app, E2E_EMAILS.adminDesaPanikel, E2E_PASSWORD);
      const accessToken = (loginResult.body.data as { accessToken: string }).accessToken;
      const refresh = (loginResult.body.data as { refreshToken: string }).refreshToken;
      await logout(context.app, accessToken, refresh);
      expect(await countAuthAuditLogs(context.db, 'LOGOUT')).toBeGreaterThan(beforeLogout);
    });
  });

  describe('Phase 2 — User Management', () => {
    it('create user ADMIN_DESA — 201', async () => {
      const result = await createUser(context.app, tokens.adminKecamatan, {
        fullName: 'Admin Desa Klaces E2E',
        email: `e2e.admin.klaces.${Date.now()}@test.local`,
        phone: '081234567804',
        password: E2E_PASSWORD,
        role: UserRole.ADMIN_DESA,
        villageId: VILLAGE_KLACES,
      });

      expect(result.response.status).toBe(201);
      assertSuccessEnvelope(result.body);
    });

    it('duplicate email — 409', async () => {
      const result = await createUser(context.app, tokens.adminKecamatan, {
        fullName: 'Duplicate User',
        email: E2E_EMAILS.adminDesaUjungalang,
        phone: '081234567899',
        password: E2E_PASSWORD,
        role: UserRole.ADMIN_DESA,
        villageId: VILLAGE_UJUNGALANG,
      });

      expect(result.response.status).toBe(409);
      assertErrorEnvelope(result.body);
    });

    it('ADMIN_DESA POST /users — 403', async () => {
      const result = await createUser(context.app, tokens.adminDesaUjungalang, {
        fullName: 'Forbidden User',
        email: 'forbidden.user@test.local',
        phone: '081234567898',
        password: E2E_PASSWORD,
        role: UserRole.ADMIN_DESA,
        villageId: VILLAGE_UJUNGALANG,
      });

      expect(result.response.status).toBe(403);
      assertErrorEnvelope(result.body);
    });
  });

  describe('Phase 3 — Village', () => {
    it('ADMIN_KECAMATAN update village — 200', async () => {
      const result = await updateVillage(context.app, tokens.adminKecamatan, VILLAGE_UJUNGALANG, {
        description: 'Desa Ujungalang — E2E updated',
      });

      expect(result.response.status).toBe(200);
    });

    it('update QRIS — file tersimpan', async () => {
      const uploadResult = await uploadFile(context.app, tokens.adminKecamatan, 'qris-ujungalang.jpg');
      expect(uploadResult.response.status).toBe(201);

      const fileId = (uploadResult.body.data as { id: string }).id;
      const qrisResult = await updateVillageQris(context.app, tokens.adminKecamatan, VILLAGE_UJUNGALANG, fileId);
      expect(qrisResult.response.status).toBe(200);

      const village = await getVillageById(context.db, VILLAGE_UJUNGALANG);
      expect(village?.qrisFileId).toBe(fileId);
    });

    it('ADMIN_DESA update village — 403', async () => {
      const result = await updateVillage(context.app, tokens.adminDesaUjungalang, VILLAGE_UJUNGALANG, {
        description: 'Should fail',
      });

      expect(result.response.status).toBe(403);
      assertErrorEnvelope(result.body);
    });
  });

  describe('Phase 4 — ROB Guardian', () => {
    it('simulasi BMKG sync — status AMAN & histories terupdate', async () => {
      vi.spyOn(BmkgService.prototype, 'fetchMetrics').mockResolvedValueOnce({
        waveHeight: 0,
        tideHeight: 0,
        rainfall: 0,
      });

      const historiesBefore = await countRobHistories(context.db);
      await context.robGuardianService.runSyncCycle();

      const status = await getCurrentRobStatus(context.db);
      expect(status?.status).toBe(RobStatus.AMAN);
      expect(await countRobHistories(context.db)).toBeGreaterThan(historiesBefore);

      const apiStatus = await getPublicRobStatus(context.app);
      expect(apiStatus.response.status).toBe(200);
      expect((apiStatus.body.data as { status: string }).status).toBe(RobStatus.AMAN);
    });

    it('manual override BAHAYA — rob_manual_overrides dibuat', async () => {
      const before = await countManualOverrides(context.db);
      const result = await manualRobOverride(context.app, tokens.adminKecamatan, RobStatus.BAHAYA, 'E2E override test');

      expect(result.response.status).toBe(201);
      expect(await countManualOverrides(context.db)).toBeGreaterThan(before);

      const status = await getCurrentRobStatus(context.db);
      expect(status?.status).toBe(RobStatus.BAHAYA);
    });

    it('webhook test — rob_webhook_logs dibuat', async () => {
      const before = await countWebhookLogs(context.db);
      const result = await testRobWebhook(context.app, tokens.adminKecamatan);

      expect(result.response.status).toBe(201);
      expect(await countWebhookLogs(context.db)).toBeGreaterThan(before);
    });
  });

  describe('Phase 5 — Banyu Mili', () => {
    let ujungalangAssetId = '';
    let panikelAssetId = '';

    it('create water asset — 201', async () => {
      const ujungalangResult = await createWaterAsset(context.app, tokens.adminKecamatan, {
        villageId: VILLAGE_UJUNGALANG,
        name: 'Tandon Ujungalang E2E',
        locationName: 'Pusat Desa',
        latitude: -7.5,
        longitude: 108.9,
        capacityLiter: 10_000,
      });

      expect(ujungalangResult.response.status).toBe(201);
      ujungalangAssetId = (ujungalangResult.body.data as { id: string }).id;

      const panikelResult = await createWaterAsset(context.app, tokens.adminKecamatan, {
        villageId: VILLAGE_PANIKEL,
        name: 'Tandon Panikel E2E',
        locationName: 'Pusat Desa',
        latitude: -7.51,
        longitude: 108.91,
        capacityLiter: 8_000,
      });

      expect(panikelResult.response.status).toBe(201);
      panikelAssetId = (panikelResult.body.data as { id: string }).id;
    });

    it('create water report — 201', async () => {
      const result = await createWaterReport(context.app, tokens.kaderDesaUjungalang, {
        waterAssetId: ujungalangAssetId,
        volumePercent: 50,
        waterCondition: 'TAWAR',
        notes: 'E2E report',
      });

      expect(result.response.status).toBe(201);
      assertSuccessEnvelope(result.body);
    });

    it('water status calculation — AMAN, SIAGA, KRITIS', async () => {
      const aman = await createWaterReport(context.app, tokens.kaderDesaUjungalang, {
        waterAssetId: ujungalangAssetId,
        volumePercent: 50,
        waterCondition: 'TAWAR',
      });
      expect((aman.body.data as { status: string }).status).toBe(WaterStatus.AMAN);

      const siaga = await createWaterReport(context.app, tokens.kaderDesaUjungalang, {
        waterAssetId: ujungalangAssetId,
        volumePercent: 30,
        waterCondition: 'TAWAR',
      });
      expect((siaga.body.data as { status: string }).status).toBe(WaterStatus.SIAGA);

      const kritis = await createWaterReport(context.app, tokens.kaderDesaUjungalang, {
        waterAssetId: ujungalangAssetId,
        volumePercent: 15,
        waterCondition: 'TAWAR',
      });
      expect((kritis.body.data as { status: string }).status).toBe(WaterStatus.KRITIS);
    });

    it('critical water 10% — water_alert & agency_notification_logs dibuat', async () => {
      const alertsBefore = await countWaterAlerts(context.db);
      const agencyLogsBefore = await countAgencyNotificationLogs(context.db);

      const result = await createWaterReport(context.app, tokens.kaderDesaUjungalang, {
        waterAssetId: ujungalangAssetId,
        volumePercent: 10,
        waterCondition: 'TAWAR',
        notes: 'Critical E2E',
      });

      expect(result.response.status).toBe(201);
      expect((result.body.data as { status: string }).status).toBe(WaterStatus.KRITIS);
      expect(await countWaterAlerts(context.db)).toBeGreaterThan(alertsBefore);
      expect(await countAgencyNotificationLogs(context.db)).toBeGreaterThan(agencyLogsBefore);
    });

    it('ownership — KADER Ujungalang akses asset Panikel — 403', async () => {
      const result = await createWaterReport(context.app, tokens.kaderDesaUjungalang, {
        waterAssetId: panikelAssetId,
        volumePercent: 50,
        waterCondition: 'TAWAR',
      });

      expect(result.response.status).toBe(403);
      assertErrorEnvelope(result.body);
    });
  });

  describe('Phase 6 — Tourism', () => {
    let destinationId = '';
    let bookingId = '';

    it('create destination — 201', async () => {
      const result = await createDestination(context.app, tokens.adminDesaUjungalang, {
        villageId: VILLAGE_UJUNGALANG,
        name: 'Pantai E2E Ujungalang',
        description: 'Destinasi wisata E2E',
        pricePerPerson: 100_000,
        capacityPerDay: 100,
        maxPeoplePerBooking: 20,
      });

      expect(result.response.status).toBe(201);
      destinationId = (result.body.data as { id: string }).id;
    });

    it('create boat owner — 201', async () => {
      for (const boat of [
        { fullName: 'Kapten E2E A', phone: '081111111201', boatName: 'Boat E2E A', boatCapacity: 10 },
        { fullName: 'Kapten E2E B', phone: '081111111202', boatName: 'Boat E2E B', boatCapacity: 10 },
        { fullName: 'Kapten E2E C', phone: '081111111203', boatName: 'Boat E2E C', boatCapacity: 10 },
      ]) {
        const result = await createBoatOwner(context.app, tokens.adminDesaUjungalang, {
          villageId: VILLAGE_UJUNGALANG,
          ...boat,
        });
        expect(result.response.status).toBe(201);
      }
    });

    it('guest booking flow — CONFIRMED + boat assignment + audit', async () => {
      const fileId = await createTestPaymentFile(context.db);
      const bookingResult = await createBooking(context.app, {
        destinationId,
        customerName: 'Tamu E2E',
        customerEmail: 'tamu@e2e.test',
        customerPhone: '081234567800',
        bookingDate: '2026-12-01',
        totalPeople: 4,
      });

      expect(bookingResult.response.status).toBe(201);
      bookingId = (bookingResult.body.data as { bookingId: string }).bookingId;

      await submitBookingPayment(context.app, { bookingId, fileId, senderName: 'Tamu E2E' });

      const verifyResult = await verifyBookingPayment(context.app, tokens.adminDesaUjungalang, bookingId);
      expect(verifyResult.response.status).toBe(200);

      const booking = await getBookingById(context.db, bookingId);
      const payment = await getLatestBookingPayment(context.db, bookingId);
      const assignments = await getBoatAssignments(context.db, bookingId);

      expect(booking?.status).toBe(BookingStatus.CONFIRMED);
      expect(payment?.paymentStatus).toBe(PaymentStatus.VERIFIED);
      expect(assignments.length).toBeGreaterThan(0);
    });

    it('boat rotation — A → B → C → A', async () => {
      const rotationDates = ['2027-01-01', '2027-01-02', '2027-01-03', '2027-01-04'];
      await resetBookingsByDates(context.db, rotationDates);
      await resetVillageTourismData(context.db, VILLAGE_KLACES);
      await deactivateBoatOwnersInVillage(context.db, VILLAGE_KLACES);

      const rotationDestination = await createDestination(context.app, tokens.adminKecamatan, {
        villageId: VILLAGE_KLACES,
        name: 'Rotasi E2E Klaces',
        description: 'Khusus test rotasi — desa isolasi',
        pricePerPerson: 75_000,
        capacityPerDay: 50,
        maxPeoplePerBooking: 10,
      });
      const rotationDestinationId = (rotationDestination.body.data as { id: string }).id;

      for (const boat of [
        { fullName: 'Rotasi A', phone: '081111111501', boatName: 'Rotasi Boat A', boatCapacity: 10 },
        { fullName: 'Rotasi B', phone: '081111111502', boatName: 'Rotasi Boat B', boatCapacity: 10 },
        { fullName: 'Rotasi C', phone: '081111111503', boatName: 'Rotasi Boat C', boatCapacity: 10 },
      ]) {
        await createBoatOwner(context.app, tokens.adminKecamatan, {
          villageId: VILLAGE_KLACES,
          ...boat,
        });
      }

      const completeBooking = async (date: string) => {
        const fileId = await createTestPaymentFile(context.db);
        const bookingResult = await createBooking(context.app, {
          destinationId: rotationDestinationId,
          customerName: 'Tamu Rotasi',
          customerEmail: 'rotasi@e2e.test',
          customerPhone: '081234567801',
          bookingDate: date,
          totalPeople: 4,
        });
        const id = (bookingResult.body.data as { bookingId: string }).bookingId;
        await submitBookingPayment(context.app, { bookingId: id, fileId, senderName: 'Tamu Rotasi' });
        await verifyBookingPayment(context.app, tokens.adminKecamatan, id);
        return id;
      };

      const b1 = await completeBooking(rotationDates[0]);
      const b2 = await completeBooking(rotationDates[1]);
      const b3 = await completeBooking(rotationDates[2]);
      const b4 = await completeBooking(rotationDates[3]);

      const owners = await Promise.all(
        [b1, b2, b3, b4].map(async (id) => (await getBoatAssignments(context.db, id))[0]?.boatOwnerId),
      );

      expect(new Set(owners.slice(0, 3)).size).toBe(3);
      expect(owners[3]).toBe(owners[0]);
    });

    it('ownership — ADMIN_DESA Panikel verify booking Ujungalang — 403', async () => {
      const result = await verifyBookingPayment(context.app, tokens.adminDesaPanikel, bookingId);
      expect(result.response.status).toBe(403);
      assertErrorEnvelope(result.body);
    });
  });

  describe('Phase 7 — Economy', () => {
    let inventoryId = '';
    let orderId = '';

    it('create fisherman — 201', async () => {
      const fishermanResult = await createFisherman(context.app, tokens.adminDesaUjungalang, {
        villageId: VILLAGE_UJUNGALANG,
        fullName: 'Nelayan E2E',
        phone: '081234567810',
      });

      expect(fishermanResult.response.status).toBe(201);
      const fishermanId = (fishermanResult.body.data as { id: string }).id;

      const inventoryResult = await createInventory(context.app, tokens.adminDesaUjungalang, {
        fishermanId,
        commodityId: SEED_COMMODITY_IKAN_BANDENG,
        availableWeightKg: 100,
        pricePerKg: 50_000,
      });

      expect(inventoryResult.response.status).toBe(201);
      inventoryId = (inventoryResult.body.data as { id: string }).id;
    });

    it('create inventory — stock movement IN dibuat', async () => {
      const movements = await getStockMovements(context.db, inventoryId);
      expect(movements.some((m) => m.movementType === MovementType.IN)).toBe(true);
    });

    it('guest order flow — CONFIRMED + stok berkurang + movement OUT', async () => {
      const fileId = await createTestPaymentFile(context.db);
      const orderResult = await createCommodityOrder(context.app, {
        buyerName: 'Pembeli E2E',
        buyerPhone: '081234567820',
        buyerEmail: 'pembeli@e2e.test',
        items: [{ inventoryId, quantityKg: 10 }],
      });

      expect(orderResult.response.status).toBe(201);
      orderId = (orderResult.body.data as { orderId: string }).orderId;

      await submitCommodityPayment(context.app, { commodityOrderId: orderId, fileId, senderName: 'Pembeli E2E' });
      await verifyCommodityPayment(context.app, tokens.adminDesaUjungalang, orderId);

      const order = await getOrderById(context.db, orderId);
      const inventory = await getInventoryById(context.db, inventoryId);
      const movements = await getStockMovements(context.db, inventoryId);

      expect(order?.status).toBe(CommodityOrderStatus.CONFIRMED);
      expect(Number(inventory?.availableWeightKg)).toBe(90);
      expect(movements.some((m) => m.movementType === MovementType.OUT)).toBe(true);
    });

    it('reject payment — stok tidak berubah', async () => {
      const fishermanResult = await createFisherman(context.app, tokens.adminDesaUjungalang, {
        villageId: VILLAGE_UJUNGALANG,
        fullName: 'Nelayan Reject E2E',
        phone: '081234567821',
      });
      const fishermanId = (fishermanResult.body.data as { id: string }).id;

      const inventoryResult = await createInventory(context.app, tokens.adminDesaUjungalang, {
        fishermanId,
        commodityId: SEED_COMMODITY_IKAN_BANDENG,
        availableWeightKg: 50,
        pricePerKg: 40_000,
      });
      const rejectInventoryId = (inventoryResult.body.data as { id: string }).id;
      const stockBefore = Number((await getInventoryById(context.db, rejectInventoryId))?.availableWeightKg);

      const fileId = await createTestPaymentFile(context.db);
      const orderResult = await createCommodityOrder(context.app, {
        buyerName: 'Pembeli Reject',
        buyerPhone: '081234567822',
        buyerEmail: 'reject@e2e.test',
        items: [{ inventoryId: rejectInventoryId, quantityKg: 5 }],
      });
      const rejectOrderId = (orderResult.body.data as { orderId: string }).orderId;

      await submitCommodityPayment(context.app, { commodityOrderId: rejectOrderId, fileId, senderName: 'Pembeli Reject' });
      await rejectCommodityPayment(context.app, tokens.adminDesaUjungalang, rejectOrderId, 'Bukti tidak valid');

      const stockAfter = Number((await getInventoryById(context.db, rejectInventoryId))?.availableWeightKg);
      expect(stockAfter).toBe(stockBefore);
    });

    it('manifest flow — status berubah sesuai flow', async () => {
      const manifestResult = await createManifest(context.app, tokens.adminDesaUjungalang, {
        manifestDate: '2026-12-15',
        villageId: VILLAGE_UJUNGALANG,
      });
      const manifestId = (manifestResult.body.data as { id: string }).id;

      await addManifestItem(context.app, tokens.adminDesaUjungalang, manifestId, orderId);
      expect((await getOrderById(context.db, orderId))?.status).toBe(CommodityOrderStatus.WAITING_MANIFEST);

      await departManifest(context.app, tokens.adminDesaUjungalang, manifestId);
      expect((await getManifestById(context.db, manifestId))?.status).toBe(ManifestStatus.DEPARTED);

      await completeManifest(context.app, tokens.adminDesaUjungalang, manifestId);
      expect((await getManifestById(context.db, manifestId))?.status).toBe(ManifestStatus.COMPLETED);
    });

    it('ownership — ADMIN_DESA Panikel akses inventory Ujungalang — 403', async () => {
      const result = await getInventoryMovements(context.app, tokens.adminDesaPanikel, inventoryId);
      expect(result.response.status).toBe(403);
      assertErrorEnvelope(result.body);
    });
  });

  describe('Phase 8 — Agency', () => {
    it('create agency — 201', async () => {
      const result = await createAgency(context.app, tokens.adminKecamatan, {
        name: 'Agency E2E Test',
        agencyType: 'OTHER',
        email: 'agency.e2e@test.local',
        phone: '08123000999',
        isActive: true,
      });

      expect(result.response.status).toBe(201);
      assertSuccessEnvelope(result.body);
    });

    it('send email — email_logs & agency_notification_logs dibuat', async () => {
      const emailsBefore = await countEmailLogs(context.db);
      const agencyLogsBefore = await countAgencyNotificationLogs(context.db);

      const result = await sendAgencyEmail(context.app, tokens.adminKecamatan, '33333333-3333-4333-8333-333333333301', {
        subject: 'E2E Test Email',
        message: 'Pesan uji E2E',
      });

      expect(result.response.status).toBe(201);
      expect(await countEmailLogs(context.db)).toBeGreaterThan(emailsBefore);
      expect(await countAgencyNotificationLogs(context.db)).toBeGreaterThan(agencyLogsBefore);
    });

    it('send WhatsApp — notification_logs & agency_notification_logs dibuat', async () => {
      const notificationsBefore = await countNotificationLogs(context.db);
      const agencyLogsBefore = await countAgencyNotificationLogs(context.db);

      const result = await sendAgencyWhatsApp(context.app, tokens.adminKecamatan, '33333333-3333-4333-8333-333333333301', 'Pesan WhatsApp E2E');

      expect(result.response.status).toBe(201);
      expect(await countNotificationLogs(context.db)).toBeGreaterThan(notificationsBefore);
      expect(await countAgencyNotificationLogs(context.db)).toBeGreaterThan(agencyLogsBefore);
    });
  });

  describe('Phase 9 — Settings', () => {
    it('create setting — 201', async () => {
      const result = await createSetting(context.app, tokens.adminKecamatan, {
        key: customSettingKey,
        value: 'initial',
        description: 'E2E custom setting',
      });

      expect(result.response.status).toBe(201);
      assertSuccessEnvelope(result.body);
    });

    it('update setting — cache invalidated', async () => {
      await context.settingsService.get(customSettingKey);
      await updateSetting(context.app, tokens.adminKecamatan, customSettingKey, { value: 'updated' });

      const cached = await context.settingsService.get(customSettingKey);
      expect(cached).toBe('updated');

      const apiResult = await getSetting(context.app, tokens.adminKecamatan, customSettingKey);
      expect((apiResult.body.data as { value: string }).value).toBe('updated');
    });

    it('delete required setting — 409', async () => {
      const result = await deleteSetting(context.app, tokens.adminKecamatan, 'ROB_WAVE_WARNING');
      expect(result.response.status).toBe(409);
      assertErrorEnvelope(result.body);
    });
  });

  describe('Phase 10 — Audit Log', () => {
    it('summary — 200', async () => {
      const result = await getAuditLogSummary(context.app, tokens.adminKecamatan);
      expect(result.response.status).toBe(200);
      assertSuccessEnvelope(result.body);
    });

    it('export CSV — file csv dihasilkan', async () => {
      const result = await exportAuditLogs(context.app, tokens.adminKecamatan);
      expect(result.response.status).toBe(200);
      expect(result.response.headers.get('content-type')).toContain('text/csv');
      expect(result.text).toContain('Timestamp');
    });

    it('sanitization — passwordHash, refreshToken, accessToken tidak muncul', async () => {
      const loginAudit = await getLatestAuditLogByAction(context.db, 'LOGIN');
      expect(loginAudit).not.toBeNull();

      const detail = await getAuditLogDetail(context.app, tokens.adminKecamatan, loginAudit!.id);
      expect(detail.response.status).toBe(200);

      const data = detail.body.data as { oldData?: unknown; newData?: unknown };
      expect(containsSensitiveAuditData(data.oldData)).toBe(false);
      expect(containsSensitiveAuditData(data.newData)).toBe(false);
    });
  });

  describe('Phase 11 — Transaction Tests', () => {
    it('tourism rollback — boat assignment gagal', async () => {
      vi.restoreAllMocks();

      const destResult = await createDestination(context.app, tokens.adminDesaUjungalang, {
        villageId: VILLAGE_UJUNGALANG,
        name: 'Rollback Tourism E2E',
        description: 'Test rollback',
        pricePerPerson: 50_000,
        capacityPerDay: 50,
        maxPeoplePerBooking: 10,
      });
      const destId = (destResult.body.data as { id: string }).id;
      const fileId = await createTestPaymentFile(context.db);

      const bookingResult = await createBooking(context.app, {
        destinationId: destId,
        customerName: 'Rollback Guest',
        customerEmail: 'rollback@e2e.test',
        customerPhone: '081234567830',
        bookingDate: '2026-12-20',
        totalPeople: 2,
      });
      const id = (bookingResult.body.data as { bookingId: string }).bookingId;

      await submitBookingPayment(context.app, { bookingId: id, fileId, senderName: 'Rollback Guest' });

      vi.spyOn(BoatAssignmentService.prototype, 'assignForBooking').mockRejectedValueOnce(new Error('Simulated boat assignment failure'));

      const verifyResult = await verifyBookingPayment(context.app, tokens.adminDesaUjungalang, id);
      expect(verifyResult.response.status).toBe(500);

      const booking = await getBookingById(context.db, id);
      const payment = await getLatestBookingPayment(context.db, id);
      expect(booking?.status).toBe(BookingStatus.WAITING_VERIFICATION);
      expect(payment?.paymentStatus).toBe(PaymentStatus.PENDING);
    });

    it('economy rollback — stock deduction gagal', async () => {
      vi.restoreAllMocks();

      const fishermanResult = await createFisherman(context.app, tokens.adminDesaUjungalang, {
        villageId: VILLAGE_UJUNGALANG,
        fullName: 'Nelayan Rollback',
        phone: '081234567831',
      });
      const inventoryResult = await createInventory(context.app, tokens.adminDesaUjungalang, {
        fishermanId: (fishermanResult.body.data as { id: string }).id,
        commodityId: SEED_COMMODITY_IKAN_BANDENG,
        availableWeightKg: 30,
        pricePerKg: 45_000,
      });
      const invId = (inventoryResult.body.data as { id: string }).id;
      const fileId = await createTestPaymentFile(context.db);

      const orderResult = await createCommodityOrder(context.app, {
        buyerName: 'Rollback Buyer',
        buyerPhone: '081234567832',
        buyerEmail: 'rollback-buyer@e2e.test',
        items: [{ inventoryId: invId, quantityKg: 5 }],
      });
      const id = (orderResult.body.data as { orderId: string }).orderId;

      await submitCommodityPayment(context.app, { commodityOrderId: id, fileId, senderName: 'Rollback Buyer' });

      vi.spyOn(CommodityInventoryRepository.prototype, 'update').mockRejectedValueOnce(new Error('Simulated stock deduction failure'));

      const verifyResult = await verifyCommodityPayment(context.app, tokens.adminDesaUjungalang, id);
      expect(verifyResult.response.status).toBe(500);

      expect((await getOrderById(context.db, id))?.status).toBe(CommodityOrderStatus.WAITING_VERIFICATION);
      expect((await getLatestOrderPayment(context.db, id))?.paymentStatus).toBe(PaymentStatus.PENDING);
    });

    it('manifest rollback — insert manifest item gagal', async () => {
      vi.restoreAllMocks();

      const fishermanResult = await createFisherman(context.app, tokens.adminDesaUjungalang, {
        villageId: VILLAGE_UJUNGALANG,
        fullName: 'Nelayan Manifest Rollback',
        phone: '081234567833',
      });
      const inventoryResult = await createInventory(context.app, tokens.adminDesaUjungalang, {
        fishermanId: (fishermanResult.body.data as { id: string }).id,
        commodityId: SEED_COMMODITY_IKAN_BANDENG,
        availableWeightKg: 20,
        pricePerKg: 40_000,
      });
      const invId = (inventoryResult.body.data as { id: string }).id;
      const fileId = await createTestPaymentFile(context.db);

      const orderResult = await createCommodityOrder(context.app, {
        buyerName: 'Manifest Rollback',
        buyerPhone: '081234567834',
        buyerEmail: 'manifest-rollback@e2e.test',
        items: [{ inventoryId: invId, quantityKg: 3 }],
      });
      const id = (orderResult.body.data as { orderId: string }).orderId;

      await submitCommodityPayment(context.app, { commodityOrderId: id, fileId, senderName: 'Manifest Rollback' });
      await verifyCommodityPayment(context.app, tokens.adminDesaUjungalang, id);

      const manifestResult = await createManifest(context.app, tokens.adminDesaUjungalang, {
        manifestDate: '2026-12-25',
        villageId: VILLAGE_UJUNGALANG,
      });
      const manifestId = (manifestResult.body.data as { id: string }).id;

      vi.spyOn(CommodityOrderRepository.prototype, 'updateStatus').mockRejectedValueOnce(new Error('Simulated manifest item failure'));

      const addResult = await addManifestItem(context.app, tokens.adminDesaUjungalang, manifestId, id);
      expect(addResult.response.status).toBe(500);

      expect((await getManifestItemsByOrderId(context.db, id))).toHaveLength(0);
      expect((await getOrderById(context.db, id))?.status).toBe(CommodityOrderStatus.CONFIRMED);
    });
  });

  describe('Phase 12 — Security Tests', () => {
    it('without token — 401', async () => {
      const response = await context.app.request(`${api}/users`);
      expect(response.status).toBe(401);
    });

    it('invalid token — 401', async () => {
      const response = await context.app.request(`${api}/users`, {
        headers: { Authorization: 'Bearer invalid-token' },
      });
      expect(response.status).toBe(401);
    });

    it('wrong role — 403', async () => {
      const response = await context.app.request(`${api}/users`, {
        headers: authHeader(tokens.kaderDesaUjungalang),
      });
      expect(response.status).toBe(403);
    });

    it('wrong ownership — 403', async () => {
      const destinationResult = await createDestination(context.app, tokens.adminDesaUjungalang, {
        villageId: VILLAGE_UJUNGALANG,
        name: 'Ownership Security Test',
        description: 'Test ownership 403',
        pricePerPerson: 50_000,
        capacityPerDay: 20,
        maxPeoplePerBooking: 5,
      });
      const destinationId = (destinationResult.body.data as { id: string }).id;
      const fileId = await createTestPaymentFile(context.db);

      const bookingResult = await createBooking(context.app, {
        destinationId,
        customerName: 'Security Guest',
        customerEmail: 'security@e2e.test',
        customerPhone: '081234567899',
        bookingDate: '2027-02-01',
        totalPeople: 2,
      });
      const foreignBookingId = (bookingResult.body.data as { bookingId: string }).bookingId;

      await submitBookingPayment(context.app, { bookingId: foreignBookingId, fileId, senderName: 'Security Guest' });

      const verifyResult = await verifyBookingPayment(context.app, tokens.adminDesaPanikel, foreignBookingId);
      expect(verifyResult.response.status).toBe(403);
      assertErrorEnvelope(verifyResult.body);
    });
  });

  describe('Phase 13 — API Convention Tests', () => {
    it('success format — { success, message, data }', async () => {
      const result = await getPublicRobStatus(context.app);
      expect(result.response.status).toBe(200);
      expect(result.body).toMatchObject({
        success: true,
        message: expect.any(String),
        data: expect.any(Object),
      });
    });

    it('error format — { success: false, message }', async () => {
      const response = await context.app.request(`${api}/users`);
      const body = await response.json();
      expect(response.status).toBe(401);
      assertErrorEnvelope(body as Record<string, unknown>);
    });

    it('pagination format — { success, data[], meta }', async () => {
      const result = await getPublicDestinations(context.app);
      expect(result.response.status).toBe(200);
      assertPaginatedEnvelope(result.body);

      const waterStatus = await getPublicWaterStatus(context.app);
      expect(waterStatus.response.status).toBe(200);
      assertSuccessEnvelope(waterStatus.body);
    });
  });
});
