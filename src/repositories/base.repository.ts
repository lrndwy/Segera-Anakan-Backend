import { eq } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import type { DatabaseClient } from '../db/client';

export type SoftDeletableRow = {
  id: string;
  deletedAt: Date | null;
};

export interface SoftDeleteRepositoryContract<TRow extends SoftDeletableRow, TCreate, TUpdate> {
  findById(id: string): Promise<TRow | null>;
  create(input: TCreate): Promise<TRow>;
  update(id: string, input: TUpdate): Promise<TRow | null>;
  softDelete(id: string): Promise<TRow | null>;
}

type TableWithSoftDelete = PgTable & {
  id: { name: string };
  deletedAt: { name: string };
};

export abstract class BaseRepository<
  TTable extends TableWithSoftDelete,
  TRow extends SoftDeletableRow,
  TCreate,
  TUpdate,
> implements SoftDeleteRepositoryContract<TRow, TCreate, TUpdate> {
  constructor(
    protected readonly db: DatabaseClient,
    protected readonly table: TTable,
  ) {}

  abstract findById(id: string): Promise<TRow | null>;
  abstract create(input: TCreate): Promise<TRow>;
  abstract update(id: string, input: TUpdate): Promise<TRow | null>;
  abstract softDelete(id: string): Promise<TRow | null>;

  protected isActive(row: TRow | undefined): row is TRow {
    return Boolean(row && !row.deletedAt);
  }

  protected async getById(id: string, fetcher: (id: string) => Promise<TRow[]>): Promise<TRow | null> {
    const rows = await fetcher(id);
    const row = rows[0];
    return this.isActive(row) ? row : null;
  }
}

export { eq };
