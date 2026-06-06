import type { MiddlewareHandler } from 'hono';
import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '../db/client';
import { users } from '../db/schema';
import { UnauthorizedException } from '../lib/exceptions';
import { jwtService } from '../lib/jwt.service';
import type { AppEnv } from '../types/app-env';
import type { CurrentUser } from '../types/current-user';
import { UserStatus } from '../constants';

type AuthMiddlewareDeps = {
  db: DatabaseClient;
};

export const createAuthMiddleware = ({ db }: AuthMiddlewareDeps): MiddlewareHandler<AppEnv> => {
  return async (context, next) => {
    const authorizationHeader = context.req.header('authorization');

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();

    try {
      const payload = jwtService.verifyAccessToken(token);

      const rows = await db
        .select({
          id: users.id,
          villageId: users.villageId,
          role: users.role,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      const user = rows[0];

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException();
      }

      const currentUser: CurrentUser = {
        id: user.id,
        villageId: user.villageId,
        role: user.role,
      };

      context.set('currentUser', currentUser);

      await next();
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException();
    }
  };
};

/** Alias sesuai spesifikasi foundation */
export const authMiddleware = createAuthMiddleware;
