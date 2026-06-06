import { UserRole } from '../../constants';
import type { DatabaseClient } from '../../db/client';
import { ForbiddenException, NotFoundException, ValidationException } from '../../lib/exceptions';
import { buildPaginationMeta, normalizePagination } from '../../lib/pagination';
import { assertVillageAccess } from '../../policies/village-access.policy';
import type { AuditLogService } from '../../services/audit-log.service';
import type { CurrentUser } from '../../types/current-user';
import { ALLOWED_IMAGE_MIME_TYPES } from '../file/file.constants';
import { FileRepository } from '../file/file.repository';
import type { ListVillagesQuery, UpdateVillageInput, UpdateVillageQrisInput } from './village.schema';
import { VillageRepository } from './village.repository';
import type { VillageDetailResponse, VillageListItemResponse, VillageServiceMeta } from './village.types';

const toListItem = (village: {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
}): VillageListItemResponse => ({
  id: village.id,
  name: village.name,
  contactName: village.contactName,
  contactPhone: village.contactPhone,
  contactEmail: village.contactEmail,
});

const toDetail = (village: {
  id: string;
  name: string;
  description: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  qrisFileIdValue: string | null;
  qrisUrl: string | null;
}): VillageDetailResponse => ({
  id: village.id,
  name: village.name,
  description: village.description,
  contactName: village.contactName,
  contactPhone: village.contactPhone,
  contactEmail: village.contactEmail,
  qris:
    village.qrisFileIdValue && village.qrisUrl
      ? {
          id: village.qrisFileIdValue,
          url: village.qrisUrl,
        }
      : null,
});

export class VillageService {
  private readonly villageRepository: VillageRepository;
  private readonly fileRepository: FileRepository;

  constructor(
    db: DatabaseClient,
    private readonly auditLogService: AuditLogService,
  ) {
    this.villageRepository = new VillageRepository(db);
    this.fileRepository = new FileRepository(db);
  }

  private resolveListScope(currentUser: CurrentUser): string | undefined {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return undefined;
    }

    return currentUser.villageId ?? undefined;
  }

  async findAll(query: ListVillagesQuery, currentUser: CurrentUser) {
    const pagination = normalizePagination({ page: query.page, limit: query.limit });
    const villageScope = this.resolveListScope(currentUser);

    if (currentUser.role !== UserRole.ADMIN_KECAMATAN && !villageScope) {
      return {
        items: [] as VillageListItemResponse[],
        meta: buildPaginationMeta({
          page: pagination.page,
          limit: pagination.limit,
          totalItems: 0,
        }),
      };
    }

    const { items, totalItems } = await this.villageRepository.findAll({
      page: pagination.page,
      limit: pagination.limit,
      offset: pagination.offset,
      search: query.search,
      villageId: villageScope,
    });

    return {
      items: items.map(toListItem),
      meta: buildPaginationMeta({
        page: pagination.page,
        limit: pagination.limit,
        totalItems,
      }),
    };
  }

  async findById(villageId: string, currentUser: CurrentUser): Promise<VillageDetailResponse> {
    assertVillageAccess(currentUser, villageId);

    const village = await this.villageRepository.findByIdWithQris(villageId);

    if (!village) {
      throw new NotFoundException('Village not found');
    }

    return toDetail(village);
  }

  async update(villageId: string, input: UpdateVillageInput, meta: VillageServiceMeta): Promise<void> {
    const existingVillage = await this.villageRepository.findById(villageId);

    if (!existingVillage) {
      throw new NotFoundException('Village not found');
    }

    const updatedVillage = await this.villageRepository.update(villageId, {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.contactName !== undefined ? { contactName: input.contactName } : {}),
      ...(input.contactPhone !== undefined ? { contactPhone: input.contactPhone } : {}),
      ...(input.contactEmail !== undefined ? { contactEmail: input.contactEmail } : {}),
    });

    if (!updatedVillage) {
      throw new NotFoundException('Village not found');
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_VILLAGE',
      module: 'VILLAGE',
      entityType: 'villages',
      entityId: villageId,
      ipAddress: meta.ipAddress,
      oldData: {
        description: existingVillage.description,
        contactName: existingVillage.contactName,
        contactPhone: existingVillage.contactPhone,
        contactEmail: existingVillage.contactEmail,
      },
      newData: {
        description: updatedVillage.description,
        contactName: updatedVillage.contactName,
        contactPhone: updatedVillage.contactPhone,
        contactEmail: updatedVillage.contactEmail,
      },
    });
  }

  async updateQris(villageId: string, input: UpdateVillageQrisInput, meta: VillageServiceMeta): Promise<void> {
    const existingVillage = await this.villageRepository.findById(villageId);

    if (!existingVillage) {
      throw new NotFoundException('Village not found');
    }

    const file = await this.fileRepository.findById(input.fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])) {
      throw new ValidationException('Validation failed', [
        { field: 'fileId', message: 'File must be an image' },
      ]);
    }

    const updatedVillage = await this.villageRepository.updateQris(villageId, input.fileId);

    if (!updatedVillage) {
      throw new NotFoundException('Village not found');
    }

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPDATE_VILLAGE_QRIS',
      module: 'VILLAGE',
      entityType: 'villages',
      entityId: villageId,
      ipAddress: meta.ipAddress,
      oldData: {
        qrisFileId: existingVillage.qrisFileId,
      },
      newData: {
        qrisFileId: updatedVillage.qrisFileId,
      },
    });
  }
}
