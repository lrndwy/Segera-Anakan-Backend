import { randomUUID } from 'crypto';

import { UserRole } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { ForbiddenException, NotFoundException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import type {
  CreateWaterAssetInput,
  ListWaterAssetsQuery,
  UpdateWaterAssetInput,
} from './water.schema';
import { WaterAssetRepository } from './water-asset.repository';
import type { BanyuMiliServiceMeta, WaterAssetResponse, WaterPublicAssetResponse } from './water.types';

const toAssetResponse = (asset: {
  id: string;
  villageId: string;
  name: string;
  locationName: string;
  latitude: string | number;
  longitude: string | number;
  capacityLiter: number;
  isActive: boolean;
}): WaterAssetResponse => ({
  id: asset.id,
  villageId: asset.villageId,
  name: asset.name,
  locationName: asset.locationName,
  latitude: Number(asset.latitude),
  longitude: Number(asset.longitude),
  capacityLiter: asset.capacityLiter,
  isActive: asset.isActive,
});

export class WaterAssetService {
  private readonly waterAssetRepository: WaterAssetRepository;

  constructor(
    db: DatabaseClient,
    private readonly auditLogService: AuditLogService,
  ) {
    this.waterAssetRepository = new WaterAssetRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return undefined;
    }

    return currentUser.villageId ?? undefined;
  }

  async getPublicSummaries(): Promise<WaterPublicAssetResponse[]> {
    const items = await this.waterAssetRepository.findPublicSummaries();
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      locationName: item.locationName,
      capacityLiter: item.capacityLiter,
      villageId: item.villageId,
      villageName: item.villageName,
    }));
  }

  async findAll(query: ListWaterAssetsQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return {
        items: [] as WaterAssetResponse[],
        meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }),
      };
    }

    const { items, totalItems } = await this.waterAssetRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      villageId: villageScope,
    });

    return {
      items: items.map(toAssetResponse),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findById(assetId: string, currentUser: CurrentUser): Promise<WaterAssetResponse> {
    const asset = await this.waterAssetRepository.findById(assetId);

    if (!asset) {
      throw new NotFoundException('Water asset not found');
    }

    assertVillageAccess(currentUser, asset.villageId);
    return toAssetResponse(asset);
  }

  async create(input: CreateWaterAssetInput, meta: BanyuMiliServiceMeta): Promise<WaterAssetResponse> {
    const asset = await this.waterAssetRepository.create({
      id: randomUUID(),
      villageId: input.villageId,
      name: input.name,
      locationName: input.locationName,
      latitude: input.latitude.toString(),
      longitude: input.longitude.toString(),
      capacityLiter: input.capacityLiter,
      isActive: true,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_WATER_ASSET',
      module: 'BANYU_MILI',
      entityType: 'water_assets',
      entityId: asset.id,
      ipAddress: meta.ipAddress,
      newData: toAssetResponse(asset),
    });

    return toAssetResponse(asset);
  }

  async update(assetId: string, input: UpdateWaterAssetInput, meta: BanyuMiliServiceMeta): Promise<WaterAssetResponse> {
    const existing = await this.waterAssetRepository.findById(assetId);

    if (!existing) {
      throw new NotFoundException('Water asset not found');
    }

    const updated = await this.waterAssetRepository.update(assetId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.locationName !== undefined ? { locationName: input.locationName } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude.toString() } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude.toString() } : {}),
      ...(input.capacityLiter !== undefined ? { capacityLiter: input.capacityLiter } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    if (!updated) {
      throw new NotFoundException('Water asset not found');
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_WATER_ASSET',
      module: 'BANYU_MILI',
      entityType: 'water_assets',
      entityId: assetId,
      ipAddress: meta.ipAddress,
      oldData: toAssetResponse(existing),
      newData: toAssetResponse(updated),
    });

    return toAssetResponse(updated);
  }

  async delete(assetId: string, meta: BanyuMiliServiceMeta): Promise<void> {
    const existing = await this.waterAssetRepository.findById(assetId);

    if (!existing) {
      throw new NotFoundException('Water asset not found');
    }

    await this.waterAssetRepository.softDelete(assetId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DELETE_WATER_ASSET',
      module: 'BANYU_MILI',
      entityType: 'water_assets',
      entityId: assetId,
      ipAddress: meta.ipAddress,
      oldData: toAssetResponse(existing),
    });
  }
}
