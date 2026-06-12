import { randomUUID } from 'crypto';

import { eq } from 'drizzle-orm';

import { buildStoragePublicUrl } from '../config/storage';
import type { DatabaseClient } from '../db/client';
import { files, type FileRow } from '../db/schema';
import { NotFoundException } from '../lib/exceptions';
import { buildStorageKey } from '../utils/file';
import type { ObjectStorageProvider } from '../modules/storage/storage.types';

export type UploadFileInput = {
  fileName: string;
  originalName: string;
  mimeType: string;
  body: Buffer;
  size: number;
  uploadedBy?: string | null | undefined;
  bucket?: string | undefined;
  keyPrefix?: string | undefined;
};

export class MinioService {
  constructor(
    private readonly db: DatabaseClient,
    private readonly provider: ObjectStorageProvider,
    private readonly defaultBucket: string,
  ) {}

  async init(): Promise<void> {
    await this.provider.ensureBucket(this.defaultBucket);
  }

  async uploadFile(input: UploadFileInput): Promise<FileRow> {
    const bucket = input.bucket ?? this.defaultBucket;
    const objectName = buildStorageKey(input.keyPrefix ?? 'uploads', input.fileName);

    await this.provider.ensureBucket(bucket);

    const uploaded = await this.provider.uploadObject({
      bucket,
      key: objectName,
      body: input.body,
      contentType: input.mimeType,
    });

    const rows = await this.db
      .insert(files)
      .values({
        id: randomUUID(),
        bucket,
        objectName,
        originalName: input.originalName,
        mimeType: input.mimeType,
        size: input.size,
        url: uploaded.url,
        uploadedBy: input.uploadedBy ?? null,
      })
      .returning();

    return rows[0] as FileRow;
  }

  async deleteFile(fileId: string): Promise<void> {
    const file = await this.findById(fileId);

    if (!file) {
      throw new NotFoundException('File not found');
    }

    await this.provider.deleteObject(file.bucket, file.objectName);
    await this.db.delete(files).where(eq(files.id, fileId));
  }

  getFileUrl(file: Pick<FileRow, 'bucket' | 'objectName'>): string {
    return buildStoragePublicUrl(file.bucket, file.objectName);
  }

  async getFileContent(file: Pick<FileRow, 'bucket' | 'objectName' | 'mimeType'>) {
    const result = await this.provider.getObject(file.bucket, file.objectName);

    return {
      body: result.body,
      contentType: result.contentType || file.mimeType || 'application/octet-stream',
    };
  }

  async findById(fileId: string): Promise<FileRow | null> {
    const rows = await this.db.select().from(files).where(eq(files.id, fileId)).limit(1);
    return rows[0] ?? null;
  }

  /** Alias sesuai spesifikasi foundation */
  upload = this.uploadFile.bind(this);
  delete = this.deleteFile.bind(this);
  getUrl = this.getFileUrl.bind(this);
}
