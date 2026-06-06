import { randomUUID } from 'crypto';

import { CommodityOrderStatus, MovementType, PaymentStatus, UserRole } from '../../constants';
import type { Database } from '../../db/client';
import { NotFoundException, ValidationException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import { runTransaction } from '../../lib/transaction';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import { VillageRepository } from '../village/village.repository';
import { CommodityInventoryRepository } from './commodity-inventory.repository';
import { CommodityOrderRepository } from './commodity-order.repository';
import { CommodityPaymentRepository } from './commodity-payment.repository';
import type { CreateCommodityOrderInput, ListCommodityOrdersQuery, RejectCommodityPaymentInput } from './economy.schema';
import type { CommodityOrderListItemResponse, CreateCommodityOrderResponse, EconomyServiceMeta } from './economy.types';
import { buildInvoiceNumber, calculateSubtotal, toNumber } from './economy.utils';

const toListItem = (order: {
  id: string;
  invoiceNumber: string;
  villageId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  totalAmount: string | number;
  status: string;
  createdAt: Date;
}): CommodityOrderListItemResponse => ({
  id: order.id,
  invoiceNumber: order.invoiceNumber,
  villageId: order.villageId,
  buyerName: order.buyerName,
  buyerPhone: order.buyerPhone,
  buyerEmail: order.buyerEmail,
  totalAmount: toNumber(order.totalAmount),
  status: order.status,
  createdAt: order.createdAt.toISOString(),
});

export class CommodityOrderService {
  private readonly orderRepository: CommodityOrderRepository;
  private readonly inventoryRepository: CommodityInventoryRepository;
  private readonly paymentRepository: CommodityPaymentRepository;
  private readonly villageRepository: VillageRepository;

  constructor(
    private readonly db: Database,
    private readonly auditLogService: AuditLogService,
  ) {
    this.orderRepository = new CommodityOrderRepository(db);
    this.inventoryRepository = new CommodityInventoryRepository(db);
    this.paymentRepository = new CommodityPaymentRepository(db);
    this.villageRepository = new VillageRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) return undefined;
    return currentUser.villageId ?? undefined;
  }

  async findAll(query: ListCommodityOrdersQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return { items: [] as CommodityOrderListItemResponse[], meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }) };
    }

    const { items, totalItems } = await this.orderRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      villageId: villageScope,
      status: query.status,
    });

    return {
      items: items.map(toListItem),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async createPublic(input: CreateCommodityOrderInput, meta: EconomyServiceMeta): Promise<CreateCommodityOrderResponse> {
    return runTransaction(this.db, async (tx) => {
      const inventoryRepo = new CommodityInventoryRepository(tx);
      const orderRepo = new CommodityOrderRepository(tx);

      let villageId: string | null = null;
      let totalAmount = 0;
      const orderItems: Array<{
        inventoryId: string;
        quantityKg: number;
        pricePerKg: number;
        subtotal: number;
      }> = [];

      for (const item of input.items) {
        const record = await inventoryRepo.findByIdWithDetails(item.inventoryId);
        if (!record) {
          throw new NotFoundException('Commodity inventory not found');
        }

        const available = toNumber(record.inventory.availableWeightKg);
        if (item.quantityKg > available) {
          throw new ValidationException('Validation failed', [
            { field: 'items', message: `Insufficient stock for inventory ${item.inventoryId}` },
          ]);
        }

        if (villageId && villageId !== record.villageId) {
          throw new ValidationException('Validation failed', [
            { field: 'items', message: 'All items must belong to the same village' },
          ]);
        }

        villageId = record.villageId;
        const pricePerKg = toNumber(record.inventory.pricePerKg);
        const subtotal = calculateSubtotal(pricePerKg, item.quantityKg);
        totalAmount += subtotal;
        orderItems.push({ inventoryId: item.inventoryId, quantityKg: item.quantityKg, pricePerKg, subtotal });
      }

      if (!villageId) {
        throw new ValidationException('Validation failed', [{ field: 'items', message: 'At least one item is required' }]);
      }

      const now = new Date();
      const datePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const sequence = (await orderRepo.countByInvoiceDatePrefix(datePrefix)) + 1;
      const invoiceNumber = buildInvoiceNumber(now, sequence);

      const order = await orderRepo.create({
        id: randomUUID(),
        invoiceNumber,
        villageId,
        buyerName: input.buyerName,
        buyerPhone: input.buyerPhone,
        buyerEmail: input.buyerEmail,
        totalAmount: totalAmount.toFixed(2),
        status: CommodityOrderStatus.PENDING_PAYMENT,
      });

      await orderRepo.createItems(
        orderItems.map((item) => ({
          id: randomUUID(),
          commodityOrderId: order.id,
          inventoryId: item.inventoryId,
          quantityKg: item.quantityKg.toString(),
          pricePerKg: item.pricePerKg.toString(),
          subtotal: item.subtotal.toString(),
        })),
      );

      const village = await this.villageRepository.findByIdWithQris(villageId);

      await this.auditLogService.create({
        userId: meta.actorUserId,
        action: 'CREATE_COMMODITY_ORDER',
        module: 'ECONOMY',
        entityType: 'commodity_orders',
        entityId: order.id,
        ipAddress: meta.ipAddress,
        newData: { invoiceNumber, totalAmount, status: order.status },
      });

      return {
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        totalAmount,
        qris:
          village?.qrisFileIdValue && village.qrisUrl
            ? { villageId, url: village.qrisUrl }
            : null,
      };
    });
  }

  async verifyPayment(orderId: string, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Commodity order not found');
    assertVillageAccess(currentUser, order.villageId);

    if (order.status !== CommodityOrderStatus.WAITING_VERIFICATION) {
      throw new ValidationException('Validation failed', [{ field: 'status', message: 'Order is not waiting for verification' }]);
    }

    const payment = await this.paymentRepository.findLatestByOrderId(orderId);
    if (!payment) throw new NotFoundException('Commodity payment not found');

    await runTransaction(this.db, async (tx) => {
      const paymentRepo = new CommodityPaymentRepository(tx);
      const orderRepo = new CommodityOrderRepository(tx);
      const inventoryRepo = new CommodityInventoryRepository(tx);

      const verifiedPayment = await paymentRepo.verifyPayment(payment.id, currentUser.id);
      if (!verifiedPayment) throw new NotFoundException('Commodity payment not found');

      const updatedOrder = await orderRepo.updateStatus(orderId, CommodityOrderStatus.CONFIRMED);
      if (!updatedOrder) throw new NotFoundException('Commodity order not found');

      const items = await orderRepo.findItemsByOrderId(orderId);

      for (const item of items) {
        const inventory = await inventoryRepo.findById(item.inventoryId);
        if (!inventory) throw new NotFoundException('Commodity inventory not found');

        const previousStock = toNumber(inventory.availableWeightKg);
        const quantity = toNumber(item.quantityKg);

        if (quantity > previousStock) {
          throw new ValidationException('Validation failed', [
            { field: 'stock', message: `Insufficient stock for inventory ${item.inventoryId}` },
          ]);
        }

        const newStock = Number((previousStock - quantity).toFixed(2));

        await inventoryRepo.update(item.inventoryId, {
          availableWeightKg: newStock.toString(),
          updatedBy: currentUser.id,
        });

        await inventoryRepo.createStockMovement({
          id: randomUUID(),
          inventoryId: item.inventoryId,
          movementType: MovementType.OUT,
          quantityKg: quantity.toString(),
          previousStockKg: previousStock.toString(),
          newStockKg: newStock.toString(),
          referenceType: 'commodity_orders',
          referenceId: orderId,
          createdBy: currentUser.id,
        });
      }
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'VERIFY_COMMODITY_PAYMENT',
      module: 'ECONOMY',
      entityType: 'commodity_orders',
      entityId: orderId,
      ipAddress: meta.ipAddress,
      newData: { status: CommodityOrderStatus.CONFIRMED },
    });
  }

  async rejectPayment(orderId: string, input: RejectCommodityPaymentInput, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<void> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Commodity order not found');
    assertVillageAccess(currentUser, order.villageId);

    if (order.status !== CommodityOrderStatus.WAITING_VERIFICATION) {
      throw new ValidationException('Validation failed', [{ field: 'status', message: 'Order is not waiting for verification' }]);
    }

    const payment = await this.paymentRepository.findLatestByOrderId(orderId);
    if (!payment) throw new NotFoundException('Commodity payment not found');

    await this.paymentRepository.rejectPayment(payment.id, currentUser.id, input.notes);
    await this.orderRepository.updateStatus(orderId, CommodityOrderStatus.PENDING_PAYMENT);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'REJECT_COMMODITY_PAYMENT',
      module: 'ECONOMY',
      entityType: 'commodity_orders',
      entityId: orderId,
      ipAddress: meta.ipAddress,
      newData: { status: CommodityOrderStatus.PENDING_PAYMENT, notes: input.notes },
    });
  }
}
