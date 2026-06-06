import { randomUUID } from 'crypto';

import { UserRole } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { ForbiddenException, NotFoundException, ValidationException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import { ALLOWED_IMAGE_MIME_TYPES } from '../file/file.constants';
import { FileRepository } from '../file/file.repository';
import type { CreateDestinationInput, ListDestinationsQuery, UpdateDestinationInput } from './tourism.schema';
import type { DestinationDetailResponse, DestinationListItemResponse, TourismServiceMeta } from './tourism.types';
import { DestinationRepository } from './destination.repository';

const toNumber = (value: string | number): number => Number(value);

const toListItem = async (
  repo: DestinationRepository,
  row: { destination: { id: string; villageId: string; name: string; description: string; pricePerPerson: string | number; capacityPerDay: number; maxPeoplePerBooking: number; isActive: boolean }; villageName: string },
): Promise<DestinationListItemResponse> => ({
  id: row.destination.id,
  villageId: row.destination.villageId,
  villageName: row.villageName,
  name: row.destination.name,
  description: row.destination.description,
  pricePerPerson: toNumber(row.destination.pricePerPerson),
  capacityPerDay: row.destination.capacityPerDay,
  maxPeoplePerBooking: row.destination.maxPeoplePerBooking,
  isActive: row.destination.isActive,
  thumbnailUrl: await repo.findFirstImageUrl(row.destination.id),
});

export class DestinationService {
  private readonly destinationRepository: DestinationRepository;
  private readonly fileRepository: FileRepository;

  constructor(
    db: DatabaseClient,
    private readonly auditLogService: AuditLogService,
  ) {
    this.destinationRepository = new DestinationRepository(db);
    this.fileRepository = new FileRepository(db);
  }

  private resolveVillageScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return undefined;
    }

    return currentUser.villageId ?? undefined;
  }

  private async validateImageFileIds(fileIds: string[] | undefined): Promise<void> {
    if (!fileIds || fileIds.length === 0) {
      return;
    }

    for (const fileId of fileIds) {
      const file = await this.fileRepository.findById(fileId);

      if (!file) {
        throw new NotFoundException('File not found');
      }

      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
        throw new ValidationException('Validation failed', [
          { field: 'imageFileIds', message: 'All files must be images' },
        ]);
      }
    }
  }

  async findAllPublic(query: ListDestinationsQuery) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const { items, totalItems } = await this.destinationRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      activeOnly: true,
    });

    const mapped = await Promise.all(items.map((item) => toListItem(this.destinationRepository, item)));

    return {
      items: mapped,
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  async findAllAdmin(query: ListDestinationsQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveVillageScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return {
        items: [] as DestinationListItemResponse[],
        meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems: 0 }),
      };
    }

    const { items, totalItems } = await this.destinationRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      villageId: villageScope,
    });

    const mapped = await Promise.all(items.map((item) => toListItem(this.destinationRepository, item)));

    return {
      items: mapped,
      meta: buildPaginationMeta({ page: pagination.page, limit: pagination.limit, totalItems }),
    };
  }

  private async buildDetail(destinationId: string, requireActive = false): Promise<DestinationDetailResponse> {
    const record = await this.destinationRepository.findByIdWithVillage(destinationId);

    if (!record || (requireActive && !record.destination.isActive)) {
      throw new NotFoundException('Destination not found');
    }

    const images = await this.destinationRepository.findImagesByDestinationId(destinationId);

    return {
      id: record.destination.id,
      villageId: record.destination.villageId,
      villageName: record.villageName,
      name: record.destination.name,
      description: record.destination.description,
      pricePerPerson: toNumber(record.destination.pricePerPerson),
      capacityPerDay: record.destination.capacityPerDay,
      maxPeoplePerBooking: record.destination.maxPeoplePerBooking,
      isActive: record.destination.isActive,
      thumbnailUrl: images[0]?.url ?? null,
      images: images.map((image) => ({
        id: image.id,
        fileId: image.fileId,
        url: image.url,
      })),
    };
  }

  async findByIdPublic(destinationId: string): Promise<DestinationDetailResponse> {
    return this.buildDetail(destinationId, true);
  }

  async create(input: CreateDestinationInput, currentUser: CurrentUser, meta: TourismServiceMeta): Promise<DestinationDetailResponse> {
    assertVillageAccess(currentUser, input.villageId);
    await this.validateImageFileIds(input.imageFileIds);

    const destination = await this.destinationRepository.create({
      id: randomUUID(),
      villageId: input.villageId,
      name: input.name,
      description: input.description,
      pricePerPerson: input.pricePerPerson.toString(),
      capacityPerDay: input.capacityPerDay,
      maxPeoplePerBooking: input.maxPeoplePerBooking,
      isActive: true,
      createdBy: currentUser.id,
    });

    if (input.imageFileIds && input.imageFileIds.length > 0) {
      await this.destinationRepository.replaceImages(destination.id, input.imageFileIds);
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'CREATE_DESTINATION',
      module: 'TOURISM',
      entityType: 'destinations',
      entityId: destination.id,
      ipAddress: meta.ipAddress,
      newData: { id: destination.id, name: destination.name },
    });

    return this.buildDetail(destination.id, false);
  }

  async update(destinationId: string, input: UpdateDestinationInput, currentUser: CurrentUser, meta: TourismServiceMeta): Promise<DestinationDetailResponse> {
    const existing = await this.destinationRepository.findById(destinationId);

    if (!existing) {
      throw new NotFoundException('Destination not found');
    }

    assertVillageAccess(currentUser, existing.villageId);
    await this.validateImageFileIds(input.imageFileIds);

    const updated = await this.destinationRepository.update(destinationId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.pricePerPerson !== undefined ? { pricePerPerson: input.pricePerPerson.toString() } : {}),
      ...(input.capacityPerDay !== undefined ? { capacityPerDay: input.capacityPerDay } : {}),
      ...(input.maxPeoplePerBooking !== undefined ? { maxPeoplePerBooking: input.maxPeoplePerBooking } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      updatedBy: currentUser.id,
    });

    if (!updated) {
      throw new NotFoundException('Destination not found');
    }

    if (input.imageFileIds !== undefined) {
      await this.destinationRepository.replaceImages(destinationId, input.imageFileIds);
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_DESTINATION',
      module: 'TOURISM',
      entityType: 'destinations',
      entityId: destinationId,
      ipAddress: meta.ipAddress,
      oldData: { name: existing.name, isActive: existing.isActive },
      newData: { name: updated.name, isActive: updated.isActive },
    });

    return this.buildDetail(destinationId, false);
  }

  async delete(destinationId: string, currentUser: CurrentUser, meta: TourismServiceMeta): Promise<void> {
    const existing = await this.destinationRepository.findById(destinationId);

    if (!existing) {
      throw new NotFoundException('Destination not found');
    }

    assertVillageAccess(currentUser, existing.villageId);

    if (currentUser.role === UserRole.KADER_DESA) {
      throw new ForbiddenException();
    }

    await this.destinationRepository.softDelete(destinationId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DELETE_DESTINATION',
      module: 'TOURISM',
      entityType: 'destinations',
      entityId: destinationId,
      ipAddress: meta.ipAddress,
      oldData: { name: existing.name },
    });
  }
}
