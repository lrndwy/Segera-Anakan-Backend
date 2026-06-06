import { randomUUID } from 'crypto';

import { MovementType, UserRole } from '../../constants';
import type { Database } from '../../db/client';
import { ForbiddenException, NotFoundException, ValidationException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { runTransaction } from '../../lib/transaction';
import { assertVillageAccess } from '../../policies/village-access.policy';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import { CommodityRepository } from './commodity.repository';
import { CommodityInventoryRepository } from './commodity-inventory.repository';
import { FishermanRepository } from './fisherman.repository';
import type {
  AdjustCommodityStockInput,
  CreateCommodityInventoryInput,
  ListCommodityInventoryQuery,
  UpdateCommodityInventoryInput,
} from './economy.schema';
import type { CommodityInventoryDetailResponse, CommodityInventoryListItemResponse, EconomyServiceMeta, StockMovementResponse } from './economy.types';
import { toNumber } from './economy.utils';

const toListItem = (row: {
  inventory: { id: string; fishermanId: string; commodityId: string; availableWeightKg: string | number; pricePerKg: string | number };
  fishermanName: string;
  commodityName: string;
  villageId: string;
  villageName: string;
}): CommodityInventoryListItemResponse => ({
  id: row.inventory.id,
  fishermanId: row.inventory.fishermanId,
  fishermanName: row.fishermanName,
  commodityId: row.inventory.commodityId,
  commodityName: row.commodityName,
  villageId: row.villageId,
  villageName: row.villageName,
  availableWeightKg: toNumber(row.inventory.availableWeightKg),
  pricePerKg: toNumber(row.inventory.pricePerKg),
});

export class CommodityInventoryService {
  private readonly inventoryRepository: CommodityInventoryRepository;
  private readonly fishermanRepository: FishermanRepository;
  private readonly commodityRepository: CommodityRepository;

  constructor(
    private readonly db: Database,
    private readonly auditLogService: AuditLogService,
  ) {
    this.inventoryRepository = new CommodityInventoryRepository(db);
    this.fishermanRepository = new FishermanRepository(db);
    this.commodityRepository = new CommodityRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) return undefined;
    return currentUser.villageId ?? undefined;
  }

  async findAllPublic(query: ListCommodityInventoryQuery) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const { items, totalItems } = await this.inventoryRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      commodityId: query.commodity_id,
      publicOnly: true,
    });

    return {
      items: items.map(toListItem),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findAllAdmin(query: ListCommodityInventoryQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return { items: [] as CommodityInventoryListItemResponse[], meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }) };
    }

    const { items, totalItems } = await this.inventoryRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      commodityId: query.commodity_id,
      villageId: villageScope,
    });

    return {
      items: items.map(toListItem),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findByIdPublic(inventoryId: string): Promise<CommodityInventoryDetailResponse> {
    const record = await this.inventoryRepository.findByIdWithDetails(inventoryId);
    if (!record || toNumber(record.inventory.availableWeightKg) <= 0) {
      throw new NotFoundException('Commodity inventory not found');
    }
    return toListItem(record);
  }

  async findByIdAdmin(inventoryId: string, currentUser: CurrentUser): Promise<CommodityInventoryDetailResponse> {
    const record = await this.inventoryRepository.findByIdWithDetails(inventoryId);
    if (!record) throw new NotFoundException('Commodity inventory not found');
    assertVillageAccess(currentUser, record.villageId);
    return toListItem(record);
  }

  async getStockMovements(inventoryId: string, currentUser: CurrentUser): Promise<StockMovementResponse[]> {
    const record = await this.inventoryRepository.findByIdWithDetails(inventoryId);
    if (!record) throw new NotFoundException('Commodity inventory not found');
    assertVillageAccess(currentUser, record.villageId);

    const movements = await this.inventoryRepository.findStockMovements(inventoryId);
    return movements.map((m) => ({
      id: m.id,
      inventoryId: m.inventoryId,
      movementType: m.movementType,
      quantityKg: toNumber(m.quantityKg),
      previousStockKg: toNumber(m.previousStockKg),
      newStockKg: toNumber(m.newStockKg),
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      notes: m.notes,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async create(input: CreateCommodityInventoryInput, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<CommodityInventoryDetailResponse> {
    const fisherman = await this.fishermanRepository.findById(input.fishermanId);
    if (!fisherman) throw new NotFoundException('Fisherman not found');
    assertVillageAccess(currentUser, fisherman.villageId);
    if (currentUser.role === UserRole.KADER_DESA) throw new ForbiddenException();

    const commodity = await this.commodityRepository.findCommodityById(input.commodityId);
    if (!commodity) throw new NotFoundException('Commodity not found');

    const inventory = await runTransaction(this.db, async (tx) => {
      const inventoryRepo = new CommodityInventoryRepository(tx);

      const created = await inventoryRepo.create({
        id: randomUUID(),
        fishermanId: input.fishermanId,
        commodityId: input.commodityId,
        availableWeightKg: input.availableWeightKg.toString(),
        pricePerKg: input.pricePerKg.toString(),
        createdBy: currentUser.id,
      });

      await inventoryRepo.createStockMovement({
        id: randomUUID(),
        inventoryId: created.id,
        movementType: MovementType.IN,
        quantityKg: input.availableWeightKg.toString(),
        previousStockKg: '0',
        newStockKg: input.availableWeightKg.toString(),
        referenceType: 'commodity_inventory',
        referenceId: created.id,
        createdBy: currentUser.id,
      });

      return created;
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_COMMODITY_INVENTORY',
      module: 'ECONOMY',
      entityType: 'commodity_inventory',
      entityId: inventory.id,
      ipAddress: meta.ipAddress,
      newData: { availableWeightKg: input.availableWeightKg, pricePerKg: input.pricePerKg },
    });

    const detail = await this.inventoryRepository.findByIdWithDetails(inventory.id);
    if (!detail) throw new NotFoundException('Commodity inventory not found');
    return toListItem(detail);
  }

  async update(inventoryId: string, input: UpdateCommodityInventoryInput, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<CommodityInventoryDetailResponse> {
    const record = await this.inventoryRepository.findByIdWithDetails(inventoryId);
    if (!record) throw new NotFoundException('Commodity inventory not found');
    assertVillageAccess(currentUser, record.villageId);
    if (currentUser.role === UserRole.KADER_DESA) throw new ForbiddenException();

    const updated = await this.inventoryRepository.update(inventoryId, {
      ...(input.availableWeightKg !== undefined ? { availableWeightKg: input.availableWeightKg.toString() } : {}),
      ...(input.pricePerKg !== undefined ? { pricePerKg: input.pricePerKg.toString() } : {}),
      updatedBy: currentUser.id,
    });

    if (!updated) throw new NotFoundException('Commodity inventory not found');

    const detail = await this.inventoryRepository.findByIdWithDetails(inventoryId);
    if (!detail) throw new NotFoundException('Commodity inventory not found');
    return toListItem(detail);
  }

  async adjustStock(inventoryId: string, input: AdjustCommodityStockInput, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<CommodityInventoryDetailResponse> {
    const record = await this.inventoryRepository.findByIdWithDetails(inventoryId);
    if (!record) throw new NotFoundException('Commodity inventory not found');
    assertVillageAccess(currentUser, record.villageId);
    if (currentUser.role === UserRole.KADER_DESA) throw new ForbiddenException();

    const previousStock = toNumber(record.inventory.availableWeightKg);
    const newStock = input.availableWeightKg;

    if (previousStock === newStock) {
      throw new ValidationException('Validation failed', [{ field: 'availableWeightKg', message: 'Stock is unchanged' }]);
    }

    const quantityDelta = Math.abs(newStock - previousStock);

    await runTransaction(this.db, async (tx) => {
      const inventoryRepo = new CommodityInventoryRepository(tx);

      await inventoryRepo.update(inventoryId, {
        availableWeightKg: newStock.toString(),
        updatedBy: currentUser.id,
      });

      await inventoryRepo.createStockMovement({
        id: randomUUID(),
        inventoryId,
        movementType: MovementType.ADJUSTMENT,
        quantityKg: quantityDelta.toString(),
        previousStockKg: previousStock.toString(),
        newStockKg: newStock.toString(),
        referenceType: 'manual_adjustment',
        referenceId: inventoryId,
        notes: input.notes ?? null,
        createdBy: currentUser.id,
      });
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'ADJUST_COMMODITY_STOCK',
      module: 'ECONOMY',
      entityType: 'commodity_inventory',
      entityId: inventoryId,
      ipAddress: meta.ipAddress,
      oldData: { availableWeightKg: previousStock },
      newData: { availableWeightKg: newStock },
    });

    const detail = await this.inventoryRepository.findByIdWithDetails(inventoryId);
    if (!detail) throw new NotFoundException('Commodity inventory not found');
    return toListItem(detail);
  }
}
