import { and, count, eq, ilike, isNull, or, sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { users, type UserRow } from '../../db/schema';
import type { UserRole, UserStatus } from '../../constants';
import { BaseRepository } from '../../repositories/base.repository';

type CreateUserInput = typeof users.$inferInsert;
type UpdateUserInput = Partial<typeof users.$inferInsert>;

export type FindAllUsersInput = {
  page: number;
  limit: number;
  offset: number;
  search?: string | undefined;
  role?: UserRole | undefined;
  status?: UserStatus | undefined;
};

export class UserRepository extends BaseRepository<typeof users, UserRow, CreateUserInput, UpdateUserInput> {
  constructor(db: DatabaseClient) {
    super(db, users);
  }

  async findById(userId: string): Promise<UserRow | null> {
    return this.getById(userId, async (id) =>
      this.db.select().from(users).where(eq(users.id, id)).limit(1),
    );
  }

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return rows[0] ?? null;
  }

  async findAll(input: FindAllUsersInput): Promise<{ items: UserRow[]; totalItems: number }> {
    const conditions = [isNull(users.deletedAt)];

    if (input.search) {
      const keyword = `%${input.search}%`;
      conditions.push(
        or(
          ilike(users.fullName, keyword),
          ilike(users.email, keyword),
          ilike(users.phone, keyword),
        )!,
      );
    }

    if (input.role) {
      conditions.push(eq(users.role, input.role));
    }

    if (input.status) {
      conditions.push(eq(users.status, input.status));
    }

    const whereClause = and(...conditions);

    const items = await this.db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(sql`${users.createdAt} desc`)
      .limit(input.limit)
      .offset(input.offset);

    const totalRows = await this.db
      .select({ count: count() })
      .from(users)
      .where(whereClause);

    return {
      items,
      totalItems: totalRows[0]?.count ?? 0,
    };
  }

  async create(input: CreateUserInput): Promise<UserRow> {
    const rows = await this.db.insert(users).values(input).returning();
    return rows[0] as UserRow;
  }

  async update(userId: string, input: UpdateUserInput): Promise<UserRow | null> {
    const rows = await this.db
      .update(users)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return this.isActive(rows[0]) ? rows[0] : null;
  }

  async softDelete(userId: string): Promise<UserRow | null> {
    const rows = await this.db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();

    return rows[0] ?? null;
  }

  async incrementRefreshTokenVersion(userId: string): Promise<UserRow | null> {
    const rows = await this.db
      .update(users)
      .set({
        refreshTokenVersion: sql`${users.refreshTokenVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return this.isActive(rows[0]) ? rows[0] : null;
  }
}
