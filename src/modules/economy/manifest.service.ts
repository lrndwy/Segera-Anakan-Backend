import { randomUUID } from 'crypto';

import { CommodityOrderStatus, ManifestStatus, UserRole } from '../../constants';
import type { Database } from '../../db/client';
import { ForbiddenException, NotFoundException, ValidationException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import { runTransaction } from '../../lib/transaction';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import { CommodityOrderRepository } from './commodity-order.repository';
import type { AddManifestItemInput, CreateManifestInput, ListManifestsQuery } from './economy.schema';
import type { EconomyServiceMeta, ManifestDetailResponse, ManifestListItemResponse } from './economy.types';
import { ManifestRepository } from './manifest.repository';

export class ManifestService {
  private readonly manifestRepository: ManifestRepository;
  private readonly orderRepository: CommodityOrderRepository;

  constructor(
    private readonly db: Database,
    private readonly auditLogService: AuditLogService,
  ) {
    this.manifestRepository = new ManifestRepository(db);
    this.orderRepository = new CommodityOrderRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) return undefined;
    return currentUser.villageId ?? undefined;
  }

  private resolveVillageId(input: CreateManifestInput, currentUser: CurrentUser): string {
    if (currentUser.role === UserRole.ADMIN_DESA) {
      if (!currentUser.villageId) throw new ForbiddenException();
      return currentUser.villageId;
    }

    if (!input.villageId) {
      throw new ValidationException('Validation failed', [{ field: 'villageId', message: 'Village is required' }]);
    }

    return input.villageId;
  }

  async findAll(query: ListManifestsQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return { items: [] as ManifestListItemResponse[], meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }) };
    }

    const { items, totalItems } = await this.manifestRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      villageId: villageScope,
    });

    return {
      items: items.map((row) => ({
        id: row.manifest.id,
        villageId: row.manifest.villageId,
        manifestDate: row.manifest.manifestDate,
        status: row.manifest.status,
        itemCount: Number(row.itemCount),
        createdAt: row.manifest.createdAt.toISOString(),
      })),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findById(manifestId: string, currentUser: CurrentUser): Promise<ManifestDetailResponse> {
    const detail = await this.manifestRepository.findDetail(manifestId);
    if (!detail) throw new NotFoundException('Manifest not found');
    assertVillageAccess(currentUser, detail.manifest.villageId);

    return {
      id: detail.manifest.id,
      villageId: detail.manifest.villageId,
      manifestDate: detail.manifest.manifestDate,
      status: detail.manifest.status,
      itemCount: detail.items.length,
      createdAt: detail.manifest.createdAt.toISOString(),
      departureTime: detail.manifest.departureTime?.toISOString() ?? null,
      completedAt: detail.manifest.completedAt?.toISOString() ?? null,
      items: detail.items.map((row) => ({
        id: row.item.id,
        commodityOrderId: row.item.commodityOrderId,
        invoiceNumber: row.invoiceNumber,
        buyerName: row.buyerName,
      })),
    };
  }

  async create(input: CreateManifestInput, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<ManifestDetailResponse> {
    const villageId = this.resolveVillageId(input, currentUser);
    assertVillageAccess(currentUser, villageId);
    if (currentUser.role === UserRole.KADER_DESA) throw new ForbiddenException();

    const manifest = await this.manifestRepository.create({
      id: randomUUID(),
      villageId,
      manifestDate: input.manifestDate,
      status: ManifestStatus.DRAFT,
      createdBy: currentUser.id,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_MANIFEST',
      module: 'ECONOMY',
      entityType: 'manifests',
      entityId: manifest.id,
      ipAddress: meta.ipAddress,
      newData: { manifestDate: input.manifestDate, status: manifest.status },
    });

    return this.findById(manifest.id, currentUser);
  }

  async addItem(manifestId: string, input: AddManifestItemInput, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<ManifestDetailResponse> {
    const manifest = await this.manifestRepository.findById(manifestId);
    if (!manifest) throw new NotFoundException('Manifest not found');
    assertVillageAccess(currentUser, manifest.villageId);

    if (manifest.status !== ManifestStatus.DRAFT) {
      throw new ValidationException('Validation failed', [{ field: 'status', message: 'Manifest is not in DRAFT status' }]);
    }

    const order = await this.orderRepository.findById(input.commodityOrderId);
    if (!order) throw new NotFoundException('Commodity order not found');

    if (order.villageId !== manifest.villageId) {
      throw new ValidationException('Validation failed', [{ field: 'commodityOrderId', message: 'Order must belong to the same village' }]);
    }

    if (order.status !== CommodityOrderStatus.CONFIRMED) {
      throw new ValidationException('Validation failed', [{ field: 'commodityOrderId', message: 'Order must be CONFIRMED' }]);
    }

    const alreadyAssigned = await this.manifestRepository.isOrderInManifest(input.commodityOrderId);
    if (alreadyAssigned) {
      throw new ValidationException('Validation failed', [{ field: 'commodityOrderId', message: 'Order is already in a manifest' }]);
    }

    await runTransaction(this.db, async (tx) => {
      const manifestRepo = new ManifestRepository(tx);
      const orderRepo = new CommodityOrderRepository(tx);

      await manifestRepo.addItem({
        id: randomUUID(),
        manifestId,
        commodityOrderId: input.commodityOrderId,
      });

      await orderRepo.updateStatus(input.commodityOrderId, CommodityOrderStatus.WAITING_MANIFEST);
    });

    return this.findById(manifestId, currentUser);
  }

  async depart(manifestId: string, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<void> {
    const manifest = await this.manifestRepository.findById(manifestId);
    if (!manifest) throw new NotFoundException('Manifest not found');
    assertVillageAccess(currentUser, manifest.villageId);

    if (manifest.status !== ManifestStatus.DRAFT && manifest.status !== ManifestStatus.READY) {
      throw new ValidationException('Validation failed', [{ field: 'status', message: 'Manifest cannot depart from current status' }]);
    }

    const departureTime = new Date();
    await this.manifestRepository.update(manifestId, {
      status: ManifestStatus.DEPARTED,
      departureTime,
      confirmedBy: currentUser.id,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DEPART_MANIFEST',
      module: 'ECONOMY',
      entityType: 'manifests',
      entityId: manifestId,
      ipAddress: meta.ipAddress,
      newData: { status: ManifestStatus.DEPARTED, departureTime: departureTime.toISOString() },
    });
  }

  async complete(manifestId: string, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<void> {
    const manifest = await this.manifestRepository.findById(manifestId);
    if (!manifest) throw new NotFoundException('Manifest not found');
    assertVillageAccess(currentUser, manifest.villageId);

    if (manifest.status !== ManifestStatus.DEPARTED) {
      throw new ValidationException('Validation failed', [{ field: 'status', message: 'Manifest must be DEPARTED before completion' }]);
    }

    const completedAt = new Date();
    await this.manifestRepository.update(manifestId, {
      status: ManifestStatus.COMPLETED,
      completedAt,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'COMPLETE_MANIFEST',
      module: 'ECONOMY',
      entityType: 'manifests',
      entityId: manifestId,
      ipAddress: meta.ipAddress,
      newData: { status: ManifestStatus.COMPLETED, completedAt: completedAt.toISOString() },
    });
  }
}
