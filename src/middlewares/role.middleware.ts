import type { MiddlewareHandler } from 'hono';

import type { UserRole } from '../constants';
import { ForbiddenException, UnauthorizedException } from '../lib/exceptions';
import type { AppEnv } from '../types/app-env';

export const roleMiddleware = (allowedRoles: UserRole[]): MiddlewareHandler<AppEnv> => {
  return async (context, next) => {
    const currentUser = context.get('currentUser');

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    if (!allowedRoles.includes(currentUser.role)) {
      throw new ForbiddenException();
    }

    await next();
  };
};
