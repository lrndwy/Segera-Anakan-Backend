import { randomUUID } from 'crypto';
import { extname } from 'path';

import { UserRole } from '../../constants';
import { ForbiddenException, NotFoundException, ValidationException } from '../../lib/exceptions';
import type { DatabaseClient } from '../../db/client';
import type { AuditLogService } from '../../services/audit-log.service';
import type { MinioService } from '../../services/minio.service';
import type { CurrentUser } from '../../types/current-user';
import {
  ALLOWED_MIME_TYPES,
  DEFAULT_FILE_KEY_PREFIX,
  MAX_FILE_SIZE_BYTES,
  type AllowedMimeType,
} from './file.constants';
import { FileRepository } from './file.repository';
import { buildFileDownloadUrl } from '../../utils/file-url';
import type { FileDetailResponse, FileServiceMeta, FileUploadResponse } from './file.types';

export type UploadFilePayload = {
  fileName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
};

const toUploadResponse = (file: {
  id: string;
  bucket: string;
  objectName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}): FileUploadResponse => ({
  id: file.id,
  bucket: file.bucket,
  objectName: file.objectName,
  originalName: file.originalName,
  mimeType: file.mimeType,
  size: file.size,
  url: file.url,
});

export class FileService {
  private readonly fileRepository: FileRepository;

  constructor(
    private readonly minioService: MinioService,
    private readonly auditLogService: AuditLogService,
    db: DatabaseClient,
  ) {
    this.fileRepository = new FileRepository(db);
  }

  validateUploadPayload(payload: UploadFilePayload | null): UploadFilePayload {
    if (!payload) {
      throw new ValidationException('Validation failed', [{ field: 'file', message: 'File is required' }]);
    }

    if (payload.size <= 0) {
      throw new ValidationException('Validation failed', [{ field: 'file', message: 'File is required' }]);
    }

    if (payload.size > MAX_FILE_SIZE_BYTES) {
      throw new ValidationException('Validation failed', [
        { field: 'file', message: 'File size must not exceed 10 MB' },
      ]);
    }

    if (!ALLOWED_MIME_TYPES.includes(payload.mimeType as AllowedMimeType)) {
      throw new ValidationException('Validation failed', [
        { field: 'file', message: 'Unsupported file type' },
      ]);
    }

    return payload;
  }

  async upload(payload: UploadFilePayload | null, currentUser: CurrentUser, meta: FileServiceMeta): Promise<FileUploadResponse> {
    const validated = this.validateUploadPayload(payload);
    const extension = extname(validated.fileName) || '';
    const storageFileName = `${randomUUID()}${extension}`;

    const uploadedFile = await this.minioService.uploadFile({
      fileName: storageFileName,
      originalName: validated.fileName,
      mimeType: validated.mimeType,
      body: validated.buffer,
      size: validated.size,
      uploadedBy: currentUser.id,
      keyPrefix: DEFAULT_FILE_KEY_PREFIX,
    });

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'UPLOAD_FILE',
      module: 'FILE_UPLOAD',
      entityType: 'files',
      entityId: uploadedFile.id,
      ipAddress: meta.ipAddress,
      newData: {
        id: uploadedFile.id,
        originalName: uploadedFile.originalName,
        mimeType: uploadedFile.mimeType,
        size: uploadedFile.size,
      },
    });

    return toUploadResponse({
      ...uploadedFile,
      url: buildFileDownloadUrl(uploadedFile.id),
    });
  }

  async findById(fileId: string, currentUser: CurrentUser): Promise<FileDetailResponse> {
    const record = await this.fileRepository.findByIdWithUploader(fileId);

    if (!record) {
      throw new NotFoundException('File not found');
    }

    this.assertCanView(currentUser, record.uploaderVillageId);

    return {
      id: record.file.id,
      url: buildFileDownloadUrl(record.file.id),
    };
  }

  async downloadPublic(fileId: string): Promise<{ body: Buffer; contentType: string; originalName: string }> {
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const content = await this.minioService.getFileContent(file);

    return {
      body: content.body,
      contentType: content.contentType,
      originalName: file.originalName,
    };
  }

  private assertCanView(currentUser: CurrentUser, uploaderVillageId: string | null): void {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return;
    }

    if (!currentUser.villageId || !uploaderVillageId || currentUser.villageId !== uploaderVillageId) {
      throw new ForbiddenException();
    }
  }

  private assertCanDelete(currentUser: CurrentUser, uploaderVillageId: string | null): void {
    if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
      return;
    }

    if (currentUser.role === UserRole.KADER_DESA) {
      throw new ForbiddenException();
    }

    if (currentUser.role === UserRole.ADMIN_DESA) {
      if (!currentUser.villageId || !uploaderVillageId || currentUser.villageId !== uploaderVillageId) {
        throw new ForbiddenException();
      }
    }
  }

  async delete(fileId: string, currentUser: CurrentUser, meta: FileServiceMeta): Promise<void> {
    const record = await this.fileRepository.findByIdWithUploader(fileId);

    if (!record) {
      throw new NotFoundException('File not found');
    }

    this.assertCanDelete(currentUser, record.uploaderVillageId);

    await this.minioService.deleteFile(fileId);

    await this.auditLogService.create({
      userId: meta.actorUserId,
      action: 'DELETE_FILE',
      module: 'FILE_UPLOAD',
      entityType: 'files',
      entityId: fileId,
      ipAddress: meta.ipAddress,
      oldData: {
        id: record.file.id,
        originalName: record.file.originalName,
        mimeType: record.file.mimeType,
      },
    });
  }
}
