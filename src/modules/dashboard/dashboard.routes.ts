import { createRoute } from '@hono/zod-openapi';
import type { MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException } from '../../lib/exceptions';
import { successResponse } from '../../lib/response';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { dashboardStatsResponseSchema, errorEnvelopeSchema, successEnvelopeSchema } from './dashboard.schema';
import type { DashboardService } from './dashboard.service';

type DashboardRouteDeps = {
  dashboardService: DashboardService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

export const createDashboardRouter = ({ dashboardService, authMiddleware }: DashboardRouteDeps) => {
  const router = createOpenAPIRouter();
  const middleware: MiddlewareHandler<AppEnv>[] = [
    authMiddleware,
    roleMiddleware([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA]),
  ];

  const statsRoute = createRoute({
    method: 'get',
    path: '/stats',
    tags: ['Dashboard'],
    summary: 'Get dashboard statistics',
    security: [{ bearerAuth: [] }],
    middleware,
    responses: {
      200: {
        description: 'Dashboard stats retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(dashboardStatsResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(statsRoute, async (context) => {
    const currentUser = context.get('currentUser');

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    const stats = await dashboardService.getStats(currentUser);
    return context.json(successResponse('Dashboard stats retrieved', stats), 200);
  });

  return router;
};
