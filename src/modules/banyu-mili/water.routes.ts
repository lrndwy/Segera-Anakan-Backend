import { createRoute } from '@hono/zod-openapi';
import type { Context, MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException } from '../../lib/exceptions';
import { z } from '../../lib/openapi-schema';
import { paginatedResponse, successResponse } from '../../lib/response';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { getRequestIp } from '../../utils/network';
import type { WaterAlertService } from './water-alert.service';
import type { WaterAssetService } from './water-asset.service';
import type { WaterReportService } from './water-report.service';
import {
  createWaterAssetSchema,
  createWaterReportSchema,
  errorEnvelopeSchema,
  listWaterAlertsQuerySchema,
  listWaterAssetsQuerySchema,
  listWaterReportsQuerySchema,
  messageEnvelopeSchema,
  paginatedEnvelopeSchema,
  resolveWaterAlertSchema,
  successEnvelopeSchema,
  updateWaterAssetSchema,
  updateWaterReportSchema,
  villageWaterStatusResponseSchema,
  waterAlertIdParamSchema,
  waterAlertResponseSchema,
  waterAssetIdParamSchema,
  waterAssetResponseSchema,
  waterPublicAssetResponseSchema,
  waterReportIdParamSchema,
  waterReportResponseSchema,
} from './water.schema';

type WaterRouteDeps = {
  waterAssetService: WaterAssetService;
  waterReportService: WaterReportService;
  waterAlertService: WaterAlertService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

const viewRolesMiddleware = (authMiddleware: MiddlewareHandler<AppEnv>): MiddlewareHandler<AppEnv>[] => [
  authMiddleware,
  roleMiddleware([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA, UserRole.KADER_DESA]),
];

const adminOnlyMiddleware = (authMiddleware: MiddlewareHandler<AppEnv>): MiddlewareHandler<AppEnv>[] => [
  authMiddleware,
  roleMiddleware([UserRole.ADMIN_KECAMATAN]),
];

const kaderOnlyMiddleware = (authMiddleware: MiddlewareHandler<AppEnv>): MiddlewareHandler<AppEnv>[] => [
  authMiddleware,
  roleMiddleware([UserRole.KADER_DESA]),
];

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

export const createPublicWaterStatusRouter = (waterReportService: WaterReportService) => {
  const router = createOpenAPIRouter();

  const getWaterStatusRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Banyu Mili'],
    summary: 'Get water status for all villages',
    security: [],
    responses: {
      200: {
        description: 'Water status retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(z.array(villageWaterStatusResponseSchema)),
          },
        },
      },
    },
  });

  router.openapi(getWaterStatusRoute, async (context) => {
    const statuses = await waterReportService.getPublicWaterStatus();
    return context.json(successResponse('Water status retrieved', statuses), 200);
  });

  return router;
};

export const createWaterAssetsRouter = ({ waterAssetService, authMiddleware }: Pick<WaterRouteDeps, 'waterAssetService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const listPublicWaterAssetsRoute = createRoute({
    method: 'get',
    path: '/public',
    tags: ['Banyu Mili'],
    summary: 'List active water asset summaries (public)',
    security: [],
    responses: {
      200: {
        description: 'Public water assets retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(z.array(waterPublicAssetResponseSchema)),
          },
        },
      },
    },
  });

  const listWaterAssetsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Banyu Mili'],
    summary: 'List water assets',
    security: [{ bearerAuth: [] }],
    middleware: viewRolesMiddleware(authMiddleware),
    request: {
      query: listWaterAssetsQuerySchema,
    },
    responses: {
      200: {
        description: 'Water assets retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(waterAssetResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getWaterAssetRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Banyu Mili'],
    summary: 'Get water asset detail',
    security: [{ bearerAuth: [] }],
    middleware: viewRolesMiddleware(authMiddleware),
    request: {
      params: waterAssetIdParamSchema,
    },
    responses: {
      200: {
        description: 'Water asset retrieved successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(waterAssetResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const createWaterAssetRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Banyu Mili'],
    summary: 'Create water asset',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware(authMiddleware),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createWaterAssetSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Water asset created successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(waterAssetResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const updateWaterAssetRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Banyu Mili'],
    summary: 'Update water asset',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware(authMiddleware),
    request: {
      params: waterAssetIdParamSchema,
      body: {
        content: {
          'application/json': {
            schema: updateWaterAssetSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Water asset updated successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(waterAssetResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const deleteWaterAssetRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Banyu Mili'],
    summary: 'Delete water asset (soft delete)',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware(authMiddleware),
    request: {
      params: waterAssetIdParamSchema,
    },
    responses: {
      200: {
        description: 'Water asset deleted successfully',
        content: {
          'application/json': {
            schema: messageEnvelopeSchema,
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(listPublicWaterAssetsRoute, async (context) => {
    const items = await waterAssetService.getPublicSummaries();
    return context.json(successResponse('Public water assets retrieved', items), 200);
  });

  router.openapi(listWaterAssetsRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await waterAssetService.findAll(query, currentUser);
    return context.json(paginatedResponse('Water assets retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getWaterAssetRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser } = getActorMeta(context);
    const asset = await waterAssetService.findById(id, currentUser);
    return context.json(successResponse('Water asset retrieved successfully', asset), 200);
  });

  router.openapi(createWaterAssetRoute, async (context) => {
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    const asset = await waterAssetService.create(body, meta);
    return context.json(successResponse('Water asset created successfully', asset), 201);
  });

  router.openapi(updateWaterAssetRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    const asset = await waterAssetService.update(id, body, meta);
    return context.json(successResponse('Water asset updated successfully', asset), 200);
  });

  router.openapi(deleteWaterAssetRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { meta } = getActorMeta(context);
    await waterAssetService.delete(id, meta);
    return context.json({ success: true, message: 'Water asset deleted successfully' }, 200);
  });

  return router;
};

export const createWaterReportsRouter = ({ waterReportService, authMiddleware }: Pick<WaterRouteDeps, 'waterReportService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const listWaterReportsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Banyu Mili'],
    summary: 'List water reports',
    security: [{ bearerAuth: [] }],
    middleware: viewRolesMiddleware(authMiddleware),
    request: {
      query: listWaterReportsQuerySchema,
    },
    responses: {
      200: {
        description: 'Water reports retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(waterReportResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const createWaterReportRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Banyu Mili'],
    summary: 'Create water report',
    security: [{ bearerAuth: [] }],
    middleware: kaderOnlyMiddleware(authMiddleware),
    request: {
      body: {
        content: {
          'application/json': {
            schema: createWaterReportSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Water report created successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(waterReportResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const updateWaterReportRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Banyu Mili'],
    summary: 'Update own water report',
    security: [{ bearerAuth: [] }],
    middleware: kaderOnlyMiddleware(authMiddleware),
    request: {
      params: waterReportIdParamSchema,
      body: {
        content: {
          'application/json': {
            schema: updateWaterReportSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Water report updated successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(waterReportResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  router.openapi(listWaterReportsRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await waterReportService.findAll(query, currentUser);
    return context.json(paginatedResponse('Water reports retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(createWaterReportRoute, async (context) => {
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const report = await waterReportService.create(body, currentUser, meta);
    return context.json(successResponse('Water report created successfully', report), 201);
  });

  router.openapi(updateWaterReportRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const report = await waterReportService.update(id, body, currentUser, meta);
    return context.json(successResponse('Water report updated successfully', report), 200);
  });

  return router;
};

export const createWaterAlertsRouter = ({ waterAlertService, authMiddleware }: Pick<WaterRouteDeps, 'waterAlertService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const listWaterAlertsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Banyu Mili'],
    summary: 'List water alerts',
    security: [{ bearerAuth: [] }],
    middleware: viewRolesMiddleware(authMiddleware),
    request: {
      query: listWaterAlertsQuerySchema,
    },
    responses: {
      200: {
        description: 'Water alerts retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(waterAlertResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const resolveWaterAlertRoute = createRoute({
    method: 'patch',
    path: '/{id}/resolve',
    tags: ['Banyu Mili'],
    summary: 'Resolve water alert',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware(authMiddleware),
    request: {
      params: waterAlertIdParamSchema,
      body: {
        content: {
          'application/json': {
            schema: resolveWaterAlertSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Water alert resolved successfully',
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

  router.openapi(listWaterAlertsRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await waterAlertService.findAll(query, currentUser);
    return context.json(paginatedResponse('Water alerts retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(resolveWaterAlertRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    await waterAlertService.resolve(id, body, meta);
    return context.json({ success: true, message: 'Water alert resolved successfully' }, 200);
  });

  return router;
};
