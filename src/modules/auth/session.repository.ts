import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '../../db/client';
import { userSessions, type NewUserSessionRow, type UserSessionRow } from '../../db/schema';

export class SessionRepository {
  constructor(private readonly db: DatabaseClient) {}

  async create(input: NewUserSessionRow): Promise<UserSessionRow> {
    const rows = await this.db.insert(userSessions).values(input).returning();
    return rows[0] as UserSessionRow;
  }

  async findByRefreshToken(refreshToken: string): Promise<UserSessionRow | null> {
    const rows = await this.db
      .select()
      .from(userSessions)
      .where(eq(userSessions.refreshToken, refreshToken))
      .limit(1);

    return rows[0] ?? null;
  }

  async deleteByRefreshToken(refreshToken: string): Promise<UserSessionRow | null> {
    const rows = await this.db
      .delete(userSessions)
      .where(eq(userSessions.refreshToken, refreshToken))
      .returning();

    return rows[0] ?? null;
  }

  async updateRefreshToken(sessionId: string, refreshToken: string, expiredAt: Date): Promise<UserSessionRow | null> {
    const rows = await this.db
      .update(userSessions)
      .set({ refreshToken, expiredAt })
      .where(eq(userSessions.id, sessionId))
      .returning();

    return rows[0] ?? null;
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.db.delete(userSessions).where(eq(userSessions.userId, userId));
  }
}
