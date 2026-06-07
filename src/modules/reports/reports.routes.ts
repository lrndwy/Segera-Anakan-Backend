import { createRoute } from '@hono/zod-openapi';
import type { MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException } from '../../lib/exceptions';
import { successResponse } from '../../lib/response';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { errorEnvelopeSchema, reportsQuerySchema, reportsResponseSchema, successEnvelopeSchema } from './reports.schema';
import type { ReportsService } from './reports.service';

type ReportsRouteDeps = {
  reportsService: ReportsService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

export const createReportsRouter = ({ reportsService, authMiddleware }: ReportsRouteDeps) => {
  const router = createOpenAPIRouter();
  const middleware: MiddlewareHandler<AppEnv>[] = [
    authMiddleware,
    roleMiddleware([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA]),
  ];

  const listReportsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Reports'],
    summary: 'Get revenue and visitor reports',
    security: [{ bearerAuth: [] }],
    middleware,
    request: {
      query: reportsQuerySchema,
    },
    responses: {
      200: {
        description: 'Reports retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(reportsResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  router.openapi(listReportsRoute, async (context) => {
    const currentUser = context.get('currentUser');

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    const query = context.req.valid('query');
    const reports = await reportsService.getReports(query, currentUser);
    return context.json(successResponse('Reports retrieved', reports), 200);
  });

  return router;
};
