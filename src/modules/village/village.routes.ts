import { createRoute } from '@hono/zod-openapi';
import type { Context, MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException } from '../../lib/exceptions';
import { paginatedResponse, successResponse } from '../../lib/response';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { getRequestIp } from '../../utils/network';
import {
  errorEnvelopeSchema,
  listVillagesQuerySchema,
  messageEnvelopeSchema,
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
  updateVillageQrisSchema,
  updateVillageSchema,
  villageDetailResponseSchema,
  villageIdParamSchema,
  villageListItemResponseSchema,
} from './village.schema';
import type { VillageService } from './village.service';

type VillageRouteDeps = {
  villageService: VillageService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

export const createVillageRouter = ({ villageService, authMiddleware }: VillageRouteDeps) => {
  const router = createOpenAPIRouter();
  const viewRolesMiddleware: MiddlewareHandler<AppEnv>[] = [
    authMiddleware,
    roleMiddleware([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA, UserRole.KADER_DESA]),
  ];
  const adminOnlyMiddleware: MiddlewareHandler<AppEnv>[] = [
    authMiddleware,
    roleMiddleware([UserRole.ADMIN_KECAMATAN]),
  ];

  const listVillagesRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Village Management'],
    summary: 'List villages',
    security: [{ bearerAuth: [] }],
    middleware: viewRolesMiddleware,
    request: {
      query: listVillagesQuerySchema,
    },
    responses: {
      200: {
        description: 'Villages retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(villageListItemResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getVillageRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Village Management'],
    summary: 'Get village detail',
    security: [{ bearerAuth: [] }],
    middleware: viewRolesMiddleware,
    request: {
      params: villageIdParamSchema,
    },
    responses: {
      200: {
        description: 'Village retrieved successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(villageDetailResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const updateVillageRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Village Management'],
    summary: 'Update village information',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware,
    request: {
      params: villageIdParamSchema,
      body: {
        content: {
          'application/json': {
            schema: updateVillageSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Village updated successfully',
        content: {
          'application/json': {
            schema: messageEnvelopeSchema,
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const updateVillageQrisRoute = createRoute({
    method: 'patch',
    path: '/{id}/qris',
    tags: ['Village Management'],
    summary: 'Update village QRIS',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware,
    request: {
      params: villageIdParamSchema,
      body: {
        content: {
          'application/json': {
            schema: updateVillageQrisSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Village QRIS updated successfully',
        content: {
          'application/json': {
            schema: messageEnvelopeSchema,
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const getActorMeta = (context: Context<AppEnv>) => {
    const currentUser = context.get('currentUser');

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    return {
      currentUser,
      meta: {
        actorUserId: currentUser.id,
        ipAddress: getRequestIp(context),
      },
    };
  };

  router.openapi(listVillagesRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await villageService.findAll(query, currentUser);
    return context.json(paginatedResponse('Villages retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getVillageRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser } = getActorMeta(context);
    const village = await villageService.findById(id, currentUser);
    return context.json(successResponse('Village retrieved successfully', village), 200);
  });

  router.openapi(updateVillageRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    await villageService.update(id, body, meta);
    return context.json({ success: true, message: 'Village updated successfully' }, 200);
  });

  router.openapi(updateVillageQrisRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    await villageService.updateQris(id, body, meta);
    return context.json({ success: true, message: 'Village QRIS updated successfully' }, 200);
  });

  return router;
};
