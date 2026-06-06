import { randomUUID } from 'crypto';

import { UserRole } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { ForbiddenException, NotFoundException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import { BoatOwnerRepository } from './boat-owner.repository';
import type { CreateBoatOwnerInput, ListBoatOwnersQuery, UpdateBoatOwnerInput } from './tourism.schema';
import type { BoatOwnerResponse, TourismServiceMeta } from './tourism.types';

const toResponse = (owner: {
  id: string;
  villageId: string;
  fullName: string;
  phone: string;
  boatName: string;
  boatCapacity: number;
  isActive: boolean;
  lastAssignedAt: Date | null;
}): BoatOwnerResponse => ({
  id: owner.id,
  villageId: owner.villageId,
  fullName: owner.fullName,
  phone: owner.phone,
  boatName: owner.boatName,
  boatCapacity: owner.boatCapacity,
  isActive: owner.isActive,
  lastAssignedAt: owner.lastAssignedAt?.toISOString() ?? null,
});

export class BoatOwnerService {
  private readonly boatOwnerRepository: BoatOwnerRepository;

  constructor(
    db: DatabaseClient,
    private readonly auditLogService: AuditLogService,
  ) {
    this.boatOwnerRepository = new BoatOwnerRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return undefined;
    }

    return currentUser.villageId ?? undefined;
  }

  async findAll(query: ListBoatOwnersQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return {
        items: [] as BoatOwnerResponse[],
        meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }),
      };
    }

    const { items, totalItems } = await this.boatOwnerRepository.findAll({
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

  async findById(boatOwnerId: string, currentUser: CurrentUser): Promise<BoatOwnerResponse> {
    const owner = await this.boatOwnerRepository.findById(boatOwnerId);

    if (!owner) {
      throw new NotFoundException('Boat owner not found');
    }

    assertVillageAccess(currentUser, owner.villageId);
    return toResponse(owner);
  }

  async create(input: CreateBoatOwnerInput, currentUser: CurrentUser, meta: TourismServiceMeta): Promise<BoatOwnerResponse> {
    assertVillageAccess(currentUser, input.villageId);

    if (currentUser.role === UserRole.KADER_DESA) {
      throw new ForbiddenException();
    }

    const owner = await this.boatOwnerRepository.create({
      id: randomUUID(),
      villageId: input.villageId,
      fullName: input.fullName,
      phone: input.phone,
      boatName: input.boatName,
      boatCapacity: input.boatCapacity,
      isActive: true,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_BOAT_OWNER',
      module: 'TOURISM',
      entityType: 'boat_owners',
      entityId: owner.id,
      ipAddress: meta.ipAddress,
      newData: toResponse(owner),
    });

    return toResponse(owner);
  }

  async update(boatOwnerId: string, input: UpdateBoatOwnerInput, currentUser: CurrentUser, meta: TourismServiceMeta): Promise<BoatOwnerResponse> {
    const existing = await this.boatOwnerRepository.findById(boatOwnerId);

    if (!existing) {
      throw new NotFoundException('Boat owner not found');
    }

    assertVillageAccess(currentUser, existing.villageId);

    if (currentUser.role === UserRole.KADER_DESA) {
      throw new ForbiddenException();
    }

    const updated = await this.boatOwnerRepository.update(boatOwnerId, {
      ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.boatName !== undefined ? { boatName: input.boatName } : {}),
      ...(input.boatCapacity !== undefined ? { boatCapacity: input.boatCapacity } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });

    if (!updated) {
      throw new NotFoundException('Boat owner not found');
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_BOAT_OWNER',
      module: 'TOURISM',
      entityType: 'boat_owners',
      entityId: boatOwnerId,
      ipAddress: meta.ipAddress,
      oldData: toResponse(existing),
      newData: toResponse(updated),
    });

    return toResponse(updated);
  }

  async delete(boatOwnerId: string, currentUser: CurrentUser, meta: TourismServiceMeta): Promise<void> {
    const existing = await this.boatOwnerRepository.findById(boatOwnerId);

    if (!existing) {
      throw new NotFoundException('Boat owner not found');
    }

    assertVillageAccess(currentUser, existing.villageId);

    if (currentUser.role === UserRole.KADER_DESA) {
      throw new ForbiddenException();
    }

    await this.boatOwnerRepository.softDelete(boatOwnerId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DELETE_BOAT_OWNER',
      module: 'TOURISM',
      entityType: 'boat_owners',
      entityId: boatOwnerId,
      ipAddress: meta.ipAddress,
      oldData: toResponse(existing),
    });
  }
}
