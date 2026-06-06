import { and, asc, count, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { boatOwners, type BoatOwnerRow } from '../../db/schema';

export type FindBoatOwnersInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
  villageId?: string | undefined;
  activeOnly?: boolean | undefined;
};

export class BoatOwnerRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findById(boatOwnerId: string): Promise<BoatOwnerRow | null> {
    const rows = await this.db
      .select()
      .from(boatOwners)
      .where(and(eq(boatOwners.id, boatOwnerId), isNull(boatOwners.deletedAt)))
      .limit(1);

    return rows[0] ?? null;
  }

  async findAll(input: FindBoatOwnersInput): Promise<{ items: BoatOwnerRow[]; totalItems: number }> {
    const conditions = [isNull(boatOwners.deletedAt)];

    if (input.villageId) {
      conditions.push(eq(boatOwners.villageId, input.villageId));
    }

    if (input.activeOnly) {
      conditions.push(eq(boatOwners.isActive, true));
    }

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(
        or(
          ilike(boatOwners.fullName, keyword),
          ilike(boatOwners.boatName, keyword),
          ilike(boatOwners.phone, keyword),
        )!,
      );
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select()
      .from(boatOwners)
      .where(whereClause)
      .orderBy(desc(boatOwners.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db.select({ count: count() }).from(boatOwners).where(whereClause);

    return { items, totalItems: totalRows[0]?.count ?? 0 };
  }

  async findActiveForRotation(villageId: string): Promise<BoatOwnerRow[]> {
    return this.db
      .select()
      .from(boatOwners)
      .where(and(eq(boatOwners.villageId, villageId), eq(boatOwners.isActive, true), isNull(boatOwners.deletedAt)))
      .orderBy(sql`${boatOwners.lastAssignedAt} asc nulls first`, asc(boatOwners.createdAt));
  }

  async create(input: typeof boatOwners.$inferInsert): Promise<BoatOwnerRow> {
    const rows = await this.db.insert(boatOwners).values(input).returning();
    return rows[0] as BoatOwnerRow;
  }

  async update(boatOwnerId: string, input: Partial<typeof boatOwners.$inferInsert>): Promise<BoatOwnerRow | null> {
    const rows = await this.db
      .update(boatOwners)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(boatOwners.id, boatOwnerId), isNull(boatOwners.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  async softDelete(boatOwnerId: string): Promise<BoatOwnerRow | null> {
    const rows = await this.db
      .update(boatOwners)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(boatOwners.id, boatOwnerId), isNull(boatOwners.deletedAt)))
      .returning();

    return rows[0] ?? null;
  }

  async updateLastAssignedAt(boatOwnerId: string, assignedAt: Date): Promise<void> {
    await this.db
      .update(boatOwners)
      .set({ lastAssignedAt: assignedAt, updatedAt: new Date() })
      .where(eq(boatOwners.id, boatOwnerId));
  }
}
