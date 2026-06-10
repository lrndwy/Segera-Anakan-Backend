import { createRoute } from '@hono/zod-openapi';
import type { Context, MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException } from '../../lib/exceptions';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import { paginatedResponse, successResponse } from '../../lib/response';
import { roleMiddleware } from '../../middlewares/role.middleware';
import type { AppEnv } from '../../types/app-env';
import { getRequestIp } from '../../utils/network';
import type { RobGuardianService } from './rob-guardian.service';
import {
  errorEnvelopeSchema,
  listRobHistoriesQuerySchema,
  manualOverrideSchema,
  messageEnvelopeSchema,
  villageAlertSchema,
  paginatedEnvelopeSchema,
  robHistoryItemResponseSchema,
  robStatusResponseSchema,
  robVillagesStatusResponseSchema,
  successEnvelopeSchema,
} from './rob.schema';

type RobRouteDeps = {
  robGuardianService: RobGuardianService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

export const createPublicRobRouter = (robGuardianService: RobGuardianService) => {
  const router = createOpenAPIRouter();

  const getRobStatusRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Rob Guardian'],
    summary: 'Get current rob status',
    security: [],
    responses: {
      200: {
        description: 'Current rob status retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(robStatusResponseSchema),
          },
        },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(getRobStatusRoute, async (context) => {
    const status = await robGuardianService.getCurrentStatus();
    return context.json(successResponse('Current rob status retrieved', status), 200);
  });

  const getRobVillageStatusRoute = createRoute({
    method: 'get',
    path: '/villages',
    tags: ['Rob Guardian'],
    summary: 'Get rob status per village',
    security: [],
    responses: {
      200: {
        description: 'Rob status per village retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(robVillagesStatusResponseSchema),
          },
        },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(getRobVillageStatusRoute, async (context) => {
    const status = await robGuardianService.getVillageStatuses();
    return context.json(successResponse('Rob status per village retrieved', status), 200);
  });

  return router;
};

export const createPublicRobHistoriesRouter = (robGuardianService: RobGuardianService) => {
  const router = createOpenAPIRouter();

  const listRobHistoriesRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Rob Guardian'],
    summary: 'List rob histories',
    security: [],
    request: {
      query: listRobHistoriesQuerySchema,
    },
    responses: {
      200: {
        description: 'Rob histories retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(robHistoryItemResponseSchema),
          },
        },
      },
    },
  });

  router.openapi(listRobHistoriesRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await robGuardianService.getHistories(query);
    return context.json(paginatedResponse('Rob histories retrieved successfully', result.items, result.meta), 200);
  });

  return router;
};

export const createAdminRobRouter = ({ robGuardianService, authMiddleware }: RobRouteDeps) => {
  const router = createOpenAPIRouter();
  const adminOnlyMiddleware: MiddlewareHandler<AppEnv>[] = [
    authMiddleware,
    roleMiddleware([UserRole.ADMIN_KECAMATAN]),
  ];

  const manualOverrideRoute = createRoute({
    method: 'post',
    path: '/manual-override',
    tags: ['Rob Guardian'],
    summary: 'Manual rob status override',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware,
    request: {
      body: {
        content: {
          'application/json': {
            schema: manualOverrideSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Manual override applied successfully',
        content: {
          'application/json': {
            schema: messageEnvelopeSchema,
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const testWebhookRoute = createRoute({
    method: 'post',
    path: '/webhook/test',
    tags: ['Rob Guardian'],
    summary: 'Send rob webhook test',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware,
    responses: {
      201: {
        description: 'Webhook test sent successfully',
        content: {
          'application/json': {
            schema: messageEnvelopeSchema,
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getActorMeta = (context: Context<AppEnv>) => {
    const currentUser = context.get('currentUser');

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    return {
      actorUserId: currentUser.id,
      ipAddress: getRequestIp(context),
    };
  };

  router.openapi(manualOverrideRoute, async (context) => {
    const body = context.req.valid('json');
    const currentUser = context.get('currentUser');

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    await robGuardianService.manualOverride(body, currentUser.id, getActorMeta(context));
    return context.json({ success: true, message: 'Manual override applied successfully' }, 201);
  });

  router.openapi(testWebhookRoute, async (context) => {
    await robGuardianService.testWebhook(getActorMeta(context));
    return context.json({ success: true, message: 'Webhook test sent successfully' }, 201);
  });

  const villageAlertRoute = createRoute({
    method: 'post',
    path: '/webhook/village-alert',
    tags: ['Rob Guardian'],
    summary: 'Send rob alert to a specific village via webhook',
    security: [{ bearerAuth: [] }],
    middleware: adminOnlyMiddleware,
    request: {
      body: {
        content: {
          'application/json': {
            schema: villageAlertSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Alert sent to village successfully',
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

  router.openapi(villageAlertRoute, async (context) => {
    const body = context.req.valid('json');
    await robGuardianService.sendVillageAlert(body, getActorMeta(context));
    return context.json({ success: true, message: 'Alert sent to village successfully' }, 200);
  });

  return router;
};
