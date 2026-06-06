import { randomUUID } from 'crypto';

import { UserRole } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { ForbiddenException, NotFoundException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import { FishermanRepository } from './fisherman.repository';
import type { CreateFishermanInput, ListFishermenQuery, UpdateFishermanInput } from './economy.schema';
import type { EconomyServiceMeta, FishermanResponse } from './economy.types';

const toResponse = (f: { id: string; villageId: string; fullName: string; phone: string | null; isActive: boolean }): FishermanResponse => ({
  id: f.id,
  villageId: f.villageId,
  fullName: f.fullName,
  phone: f.phone,
  isActive: f.isActive,
});

export class FishermanService {
  private readonly fishermanRepository: FishermanRepository;

  constructor(db: DatabaseClient, private readonly auditLogService: AuditLogService) {
    this.fishermanRepository = new FishermanRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) return undefined;
    return currentUser.villageId ?? undefined;
  }

  async findAll(query: ListFishermenQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return { items: [] as FishermanResponse[], meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }) };
    }

    const { items, totalItems } = await this.fishermanRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      villageId: villageScope,
    });

    return {
      items: items.map(toResponse),
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findById(fishermanId: string, currentUser: CurrentUser): Promise<FishermanResponse> {
    const fisherman = await this.fishermanRepository.findById(fishermanId);
    if (!fisherman) throw new NotFoundException('Fisherman not found');
    assertVillageAccess(currentUser, fisherman.villageId);
    return toResponse(fisherman);
  }

  async create(input: CreateFishermanInput, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<FishermanResponse> {
    assertVillageAccess(currentUser, input.villageId);
    if (currentUser.role === UserRole.KADER_DESA) throw new ForbiddenException();

    const fisherman = await this.fishermanRepository.create({
      id: randomUUID(),
      villageId: input.villageId,
      fullName: input.fullName,
      phone: input.phone ?? null,
      isActive: true,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_FISHERMAN',
      module: 'ECONOMY',
      entityType: 'fishermen',
      entityId: fisherman.id,
      ipAddress: meta.ipAddress,
      newData: toResponse(fisherman),
    });

    return toResponse(fisherman);
  }

  async update(fishermanId: string, input: UpdateFishermanInput, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<FishermanResponse> {
    const existing = await this.fishermanRepository.findById(fishermanId);
    if (!existing) throw new NotFoundException('Fisherman not found');
    assertVillageAccess(currentUser, existing.villageId);
    if (currentUser.role === UserRole.KADER_DESA) throw new ForbiddenException();

    const updated = await this.fishermanRepository.update(fishermanId, {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    if (!updated) throw new NotFoundException('Fisherman not found');

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_FISHERMAN',
      module: 'ECONOMY',
      entityType: 'fishermen',
      entityId: fishermanId,
      ipAddress: meta.ipAddress,
      oldData: toResponse(existing),
      newData: toResponse(updated),
    });

    return toResponse(updated);
  }

  async delete(fishermanId: string, currentUser: CurrentUser, meta: EconomyServiceMeta): Promise<void> {
    const existing = await this.fishermanRepository.findById(fishermanId);
    if (!existing) throw new NotFoundException('Fisherman not found');
    assertVillageAccess(currentUser, existing.villageId);
    if (currentUser.role === UserRole.KADER_DESA) throw new ForbiddenException();

    await this.fishermanRepository.softDelete(fishermanId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DELETE_FISHERMAN',
      module: 'ECONOMY',
      entityType: 'fishermen',
      entityId: fishermanId,
      ipAddress: meta.ipAddress,
      oldData: toResponse(existing),
    });
  }
}
