import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommodityOrderStatus, ManifestStatus, MovementType, PaymentStatus } from '../../../src/constants';
import { CommodityInventoryRepository } from '../../../src/modules/economy/commodity-inventory.repository';
import { assertErrorEnvelope, assertSuccessEnvelope } from '../../helpers/assertions';
import {
  countEconomyAuditLogs,
  createTestCommodityImageFile,
  createTestPaymentFile,
  getInventoryById,
  getLatestOrderPayment,
  getManifestById,
  getManifestItems,
  getOrderById,
  getStockMovements,
  resetEconomyTestData,
  SEED_COMMODITY_IKAN_BANDENG,
} from '../../helpers/economy-db';
import {
  addManifestItem,
  completeManifest,
  createCommodityOrder,
  createFisherman,
  createInventory,
  createManifest,
  departManifest,
  getInventoryMovements,
  listInventory,
  updateInventory,
  rejectCommodityPayment,
  submitCommodityPayment,
  verifyCommodityPayment,
} from '../../helpers/economy-http';
import { runMigrations } from '../../helpers/migrate';
import { closeTestApp, createTestApp, type TestAppContext } from '../../helpers/test-app';
import {
  getTestTokens,
  seedTestUsers,
  VILLAGE_UJUNGGAGAK,
  type TestTokens,
} from '../../helpers/test-users';

const INITIAL_STOCK_KG = 100;
const ORDER_QUANTITY_KG = 10;
const MANIFEST_DATE = '2026-06-15';

const defaultOrderInput = (inventoryId: string, quantityKg = ORDER_QUANTITY_KG) => ({
  buyerName: 'Pembeli Test',
  buyerPhone: '081234567890',
  buyerEmail: 'pembeli@example.com',
  items: [{ inventoryId, quantityKg }],
});

describe('Economy Integration', () => {
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
    await resetEconomyTestData(context.db);
  });

  const setupEconomyFixtures = async () => {
    const fishermanResult = await createFisherman(context.app, tokens.adminDesaUjunggagak, {
      villageId: VILLAGE_UJUNGGAGAK,
      fullName: 'Nelayan Test',
      phone: '081234567801',
    });

    expect(fishermanResult.response.status).toBe(201);
    assertSuccessEnvelope(fishermanResult.body as Record<string, unknown>);

    const fishermanId = (fishermanResult.body as { data: { id: string } }).data.id;

    const inventoryResult = await createInventory(context.app, tokens.adminDesaUjunggagak, {
      fishermanId,
      commodityId: SEED_COMMODITY_IKAN_BANDENG,
      availableWeightKg: INITIAL_STOCK_KG,
      pricePerKg: 50_000,
    });

    expect(inventoryResult.response.status).toBe(201);
    assertSuccessEnvelope(inventoryResult.body as Record<string, unknown>);

    const inventoryId = (inventoryResult.body as { data: { id: string } }).data.id;

    return { fishermanId, inventoryId };
  };

  describe('Inventory', () => {
    it('create inventory with image — returns fileId and imageUrl', async () => {
      const fishermanResult = await createFisherman(context.app, tokens.adminDesaUjunggagak, {
        villageId: VILLAGE_UJUNGGAGAK,
        fullName: 'Nelayan Gambar',
        phone: '081234567899',
      });
      const fishermanId = (fishermanResult.body as { data: { id: string } }).data.id;
      const fileId = await createTestCommodityImageFile(context.db);

      const inventoryResult = await createInventory(context.app, tokens.adminDesaUjunggagak, {
        fishermanId,
        commodityId: SEED_COMMODITY_IKAN_BANDENG,
        availableWeightKg: INITIAL_STOCK_KG,
        pricePerKg: 50_000,
        fileId,
      });

      expect(inventoryResult.response.status).toBe(201);
      assertSuccessEnvelope(inventoryResult.body as Record<string, unknown>);

      const created = (inventoryResult.body as { data: { id: string; fileId: string; imageUrl: string } }).data;
      expect(created.fileId).toBe(fileId);
      expect(created.imageUrl).toContain(fileId);

      const listResult = await listInventory(context.app);
      expect(listResult.response.status).toBe(200);

      const listedItem = (listResult.body as { data: Array<{ id: string; fileId: string | null; imageUrl: string | null }> }).data.find(
        (item) => item.id === created.id,
      );
      expect(listedItem?.fileId).toBe(fileId);
      expect(listedItem?.imageUrl).toBe(created.imageUrl);

      const stored = await getInventoryById(context.db, created.id);
      expect(stored?.fileId).toBe(fileId);
    });

    it('update inventory image — dapat diperbarui dan dihapus', async () => {
      const fishermanResult = await createFisherman(context.app, tokens.adminDesaUjunggagak, {
        villageId: VILLAGE_UJUNGGAGAK,
        fullName: 'Nelayan Update Gambar',
        phone: '081234567898',
      });
      const fishermanId = (fishermanResult.body as { data: { id: string } }).data.id;
      const initialFileId = await createTestCommodityImageFile(context.db);

      const inventoryResult = await createInventory(context.app, tokens.adminDesaUjunggagak, {
        fishermanId,
        commodityId: SEED_COMMODITY_IKAN_BANDENG,
        availableWeightKg: INITIAL_STOCK_KG,
        pricePerKg: 50_000,
        fileId: initialFileId,
      });
      const inventoryId = (inventoryResult.body as { data: { id: string } }).data.id;

      const nextFileId = await createTestCommodityImageFile(context.db);
      const updateResult = await updateInventory(context.app, tokens.adminDesaUjunggagak, inventoryId, {
        pricePerKg: 55_000,
        fileId: nextFileId,
      });

      expect(updateResult.response.status).toBe(200);
      const updated = (updateResult.body as { data: { fileId: string | null; imageUrl: string | null; pricePerKg: number } }).data;
      expect(updated.fileId).toBe(nextFileId);
      expect(updated.imageUrl).toContain(nextFileId);
      expect(updated.pricePerKg).toBe(55_000);

      const removeImageResult = await updateInventory(context.app, tokens.adminDesaUjunggagak, inventoryId, {
        fileId: null,
      });

      expect(removeImageResult.response.status).toBe(200);
      const removed = (removeImageResult.body as { data: { fileId: string | null; imageUrl: string | null } }).data;
      expect(removed.fileId).toBeNull();
      expect(removed.imageUrl).toBeNull();
    });

    it('create inventory — stock movement IN dibuat', async () => {
      const { inventoryId } = await setupEconomyFixtures();

      const movements = await getStockMovements(context.db, inventoryId);

      expect(movements).toHaveLength(1);
      expect(movements[0]?.movementType).toBe(MovementType.IN);
      expect(Number(movements[0]?.quantityKg)).toBe(INITIAL_STOCK_KG);
      expect(Number(movements[0]?.previousStockKg)).toBe(0);
      expect(Number(movements[0]?.newStockKg)).toBe(INITIAL_STOCK_KG);

      const apiMovements = await getInventoryMovements(context.app, tokens.adminDesaUjunggagak, inventoryId);
      expect(apiMovements.response.status).toBe(200);
      expect((apiMovements.body as { data: Array<{ movementType: string }> }).data[0]?.movementType).toBe(
        MovementType.IN,
      );
    });
  });

  describe('Order Flow', () => {
    it('Create Order → Upload Payment → Verify → Stock Deduction → Manifest → Depart → Complete', async () => {
      const { inventoryId } = await setupEconomyFixtures();
      const fileId = await createTestPaymentFile(context.db);

      const orderResult = await createCommodityOrder(context.app, defaultOrderInput(inventoryId));
      expect(orderResult.response.status).toBe(201);
      assertSuccessEnvelope(orderResult.body as Record<string, unknown>);

      const orderId = (orderResult.body as { data: { orderId: string } }).data.orderId;

      const inventoryBeforeVerify = await getInventoryById(context.db, inventoryId);
      expect(Number(inventoryBeforeVerify?.availableWeightKg)).toBe(INITIAL_STOCK_KG);

      await submitCommodityPayment(context.app, {
        commodityOrderId: orderId,
        fileId,
        senderName: 'Pembeli Test',
      });

      const verifyResult = await verifyCommodityPayment(context.app, tokens.adminDesaUjunggagak, orderId);
      expect(verifyResult.response.status).toBe(200);

      const orderAfterVerify = await getOrderById(context.db, orderId);
      expect(orderAfterVerify?.status).toBe(CommodityOrderStatus.CONFIRMED);

      const inventoryAfterVerify = await getInventoryById(context.db, inventoryId);
      expect(Number(inventoryAfterVerify?.availableWeightKg)).toBe(INITIAL_STOCK_KG - ORDER_QUANTITY_KG);

      const movementsAfterVerify = await getStockMovements(context.db, inventoryId);
      const outMovement = movementsAfterVerify.find((movement) => movement.movementType === MovementType.OUT);
      expect(outMovement).toBeDefined();
      expect(Number(outMovement?.quantityKg)).toBe(ORDER_QUANTITY_KG);
      expect(outMovement?.referenceId).toBe(orderId);

      const manifestResult = await createManifest(context.app, tokens.adminDesaUjunggagak, {
        manifestDate: MANIFEST_DATE,
        villageId: VILLAGE_UJUNGGAGAK,
      });
      expect(manifestResult.response.status).toBe(201);

      const manifestId = (manifestResult.body as { data: { id: string } }).data.id;

      const addItemResult = await addManifestItem(context.app, tokens.adminDesaUjunggagak, manifestId, orderId);
      expect(addItemResult.response.status).toBe(201);

      const manifestItems = await getManifestItems(context.db, manifestId);
      expect(manifestItems.some((item) => item.commodityOrderId === orderId)).toBe(true);

      const orderInManifest = await getOrderById(context.db, orderId);
      expect(orderInManifest?.status).toBe(CommodityOrderStatus.WAITING_MANIFEST);

      const departResult = await departManifest(context.app, tokens.adminDesaUjunggagak, manifestId);
      expect(departResult.response.status).toBe(200);

      const manifestDeparted = await getManifestById(context.db, manifestId);
      expect(manifestDeparted?.status).toBe(ManifestStatus.DEPARTED);

      const completeResult = await completeManifest(context.app, tokens.adminDesaUjunggagak, manifestId);
      expect(completeResult.response.status).toBe(200);

      const manifestCompleted = await getManifestById(context.db, manifestId);
      expect(manifestCompleted?.status).toBe(ManifestStatus.COMPLETED);
    });
  });

  describe('Payment Rejection', () => {
    it('upload payment → reject payment — stok tidak berubah', async () => {
      const { inventoryId } = await setupEconomyFixtures();
      const fileId = await createTestPaymentFile(context.db);

      const orderResult = await createCommodityOrder(context.app, defaultOrderInput(inventoryId));
      const orderId = (orderResult.body as { data: { orderId: string } }).data.orderId;

      await submitCommodityPayment(context.app, {
        commodityOrderId: orderId,
        fileId,
        senderName: 'Pembeli Test',
      });

      const rejectResult = await rejectCommodityPayment(
        context.app,
        tokens.adminDesaUjunggagak,
        orderId,
        'Bukti transfer tidak valid',
      );
      expect(rejectResult.response.status).toBe(200);

      const inventory = await getInventoryById(context.db, inventoryId);
      expect(Number(inventory?.availableWeightKg)).toBe(INITIAL_STOCK_KG);

      const movements = await getStockMovements(context.db, inventoryId);
      expect(movements.every((movement) => movement.movementType === MovementType.IN)).toBe(true);
      expect(movements).toHaveLength(1);

      const order = await getOrderById(context.db, orderId);
      expect(order?.status).toBe(CommodityOrderStatus.PENDING_PAYMENT);
    });
  });

  describe('Transaction', () => {
    it('stock deduction gagal — verify payment di-rollback', async () => {
      const { inventoryId } = await setupEconomyFixtures();
      const fileId = await createTestPaymentFile(context.db);

      const orderResult = await createCommodityOrder(context.app, defaultOrderInput(inventoryId));
      const orderId = (orderResult.body as { data: { orderId: string } }).data.orderId;

      await submitCommodityPayment(context.app, {
        commodityOrderId: orderId,
        fileId,
        senderName: 'Pembeli Test',
      });

      vi.spyOn(CommodityInventoryRepository.prototype, 'update').mockRejectedValueOnce(
        new Error('Simulated stock deduction failure'),
      );

      const verifyResult = await verifyCommodityPayment(context.app, tokens.adminDesaUjunggagak, orderId);
      expect(verifyResult.response.status).toBe(500);

      const order = await getOrderById(context.db, orderId);
      const payment = await getLatestOrderPayment(context.db, orderId);
      const inventory = await getInventoryById(context.db, inventoryId);
      const movements = await getStockMovements(context.db, inventoryId);

      expect(order?.status).toBe(CommodityOrderStatus.WAITING_VERIFICATION);
      expect(payment?.paymentStatus).toBe(PaymentStatus.PENDING);
      expect(Number(inventory?.availableWeightKg)).toBe(INITIAL_STOCK_KG);
      expect(movements.some((movement) => movement.movementType === MovementType.OUT)).toBe(false);
      expect(await countEconomyAuditLogs(context.db, 'VERIFY_COMMODITY_PAYMENT', orderId)).toBe(0);
    });
  });

  describe('Ownership', () => {
    it('ADMIN_DESA desa lain — akses verify payment order desa B → 403', async () => {
      const { inventoryId } = await setupEconomyFixtures();
      const fileId = await createTestPaymentFile(context.db);

      const orderResult = await createCommodityOrder(context.app, defaultOrderInput(inventoryId));
      const orderId = (orderResult.body as { data: { orderId: string } }).data.orderId;

      await submitCommodityPayment(context.app, {
        commodityOrderId: orderId,
        fileId,
        senderName: 'Pembeli Test',
      });

      const verifyResult = await verifyCommodityPayment(context.app, tokens.adminDesaUjungalang, orderId);
      expect(verifyResult.response.status).toBe(403);
      assertErrorEnvelope(verifyResult.body as Record<string, unknown>);
    });
  });

  describe('Audit Log', () => {
    it('VERIFY_COMMODITY_PAYMENT, CREATE_MANIFEST, COMPLETE_MANIFEST tercatat', async () => {
      const { inventoryId } = await setupEconomyFixtures();
      const fileId = await createTestPaymentFile(context.db);

      const orderResult = await createCommodityOrder(context.app, defaultOrderInput(inventoryId));
      const orderId = (orderResult.body as { data: { orderId: string } }).data.orderId;

      await submitCommodityPayment(context.app, {
        commodityOrderId: orderId,
        fileId,
        senderName: 'Pembeli Test',
      });

      await verifyCommodityPayment(context.app, tokens.adminDesaUjunggagak, orderId);
      expect(await countEconomyAuditLogs(context.db, 'VERIFY_COMMODITY_PAYMENT', orderId)).toBe(1);

      const manifestResult = await createManifest(context.app, tokens.adminDesaUjunggagak, {
        manifestDate: MANIFEST_DATE,
        villageId: VILLAGE_UJUNGGAGAK,
      });
      const manifestId = (manifestResult.body as { data: { id: string } }).data.id;

      expect(await countEconomyAuditLogs(context.db, 'CREATE_MANIFEST', manifestId)).toBe(1);

      await addManifestItem(context.app, tokens.adminDesaUjunggagak, manifestId, orderId);
      await departManifest(context.app, tokens.adminDesaUjunggagak, manifestId);
      await completeManifest(context.app, tokens.adminDesaUjunggagak, manifestId);

      expect(await countEconomyAuditLogs(context.db, 'COMPLETE_MANIFEST', manifestId)).toBe(1);
    });
  });
});
