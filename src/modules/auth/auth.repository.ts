import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { users, type UserRow } from '../../db/schema';

export class AuthRepository {
  constructor(private readonly db: DatabaseClient) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    const user = rows[0];

    if (!user || user.deletedAt) {
      return null;
    }

    return user;
  }

  async findById(userId: string): Promise<UserRow | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = rows[0];

    if (!user || user.deletedAt) {
      return null;
    }

    return user;
  }

  async updateLastLoginAt(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }
}
