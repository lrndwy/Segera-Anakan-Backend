import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { files, users, type FileRow } from '../../db/schema';

export type FileWithUploader = {
  file: FileRow;
  uploaderVillageId: string | null;
};

export class FileRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(fileId: string): Promise<FileRow | null> {
    const rows = await this.db.select().from(files).where(eq(files.id, fileId)).limit(1);
    return rows[0] ?? null;
  }

  async findByIdWithUploader(fileId: string): Promise<FileWithUploader | null> {
    const rows = await this.db
      .select({
        file: files,
        uploaderVillageId: users.villageId,
      })
      .from(files)
      .leftJoin(users, eq(files.uploadedBy, users.id))
      .where(eq(files.id, fileId))
      .limit(1);

    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      file: row.file,
      uploaderVillageId: row.uploaderVillageId,
    };
  }
}
