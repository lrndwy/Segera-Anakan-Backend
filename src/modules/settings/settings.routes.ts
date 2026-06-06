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
  createSettingSchema,
  errorEnvelopeSchema,
  listSettingsQuerySchema,
  messageEnvelopeSchema,
  paginatedEnvelopeSchema,
  settingKeyParamSchema,
  settingResponseSchema,
  successEnvelopeSchema,
  updateSettingSchema,
} from './settings.schema';
import type { SettingsService } from './settings.service';

type SettingsRouteDeps = {
  settingsService: SettingsService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

const adminKecamatanMiddleware = (authMiddleware: MiddlewareHandler<AppEnv>): MiddlewareHandler<AppEnv>[] => [
  authMiddleware,
  roleMiddleware([UserRole.ADMIN_KECAMATAN]),
];

const getActorMeta = (context: Context<AppEnv>) => {
  const currentUser = context.get('currentUser');
  if (!currentUser) throw new UnauthorizedException();
  return {
    meta: {
      actorUserId: currentUser.id,
      ipAddress: getRequestIp(context),
    },
  };
};

export const createSettingsRouter = ({ settingsService, authMiddleware }: SettingsRouteDeps) => {
  const router = createOpenAPIRouter();
  const middleware = adminKecamatanMiddleware(authMiddleware);

  const listSettingsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Settings'],
    summary: 'List settings',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { query: listSettingsQuerySchema },
    responses: {
      200: {
        description: 'Settings retrieved successfully',
        content: { 'application/json': { schema: paginatedEnvelopeSchema(settingResponseSchema) } },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getSettingRoute = createRoute({
    method: 'get',
    path: '/{key}',
    tags: ['Settings'],
    summary: 'Get setting by key',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { params: settingKeyParamSchema },
    responses: {
      200: {
        description: 'Setting retrieved successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(settingResponseSchema) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const createSettingRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Settings'],
    summary: 'Create setting',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { body: { content: { 'application/json': { schema: createSettingSchema } } } },
    responses: {
      201: {
        description: 'Setting created successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(settingResponseSchema) } },
      },
      409: { description: 'Conflict', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const updateSettingRoute = createRoute({
    method: 'patch',
    path: '/{key}',
    tags: ['Settings'],
    summary: 'Update setting',
    security: [{ bearerAuth: [] }],
    middleware,
    request: {
      params: settingKeyParamSchema,
      body: { content: { 'application/json': { schema: updateSettingSchema } } },
    },
    responses: {
      200: {
        description: 'Setting updated successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(settingResponseSchema) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const deleteSettingRoute = createRoute({
    method: 'delete',
    path: '/{key}',
    tags: ['Settings'],
    summary: 'Delete setting',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { params: settingKeyParamSchema },
    responses: {
      200: { description: 'Setting deleted successfully', content: { 'application/json': { schema: messageEnvelopeSchema } } },
      409: { description: 'Conflict', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(listSettingsRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await settingsService.findAll(query);
    return context.json(paginatedResponse('Settings retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getSettingRoute, async (context) => {
    const { key } = context.req.valid('param');
    const setting = await settingsService.findByKey(key);
    return context.json(successResponse('Setting retrieved successfully', setting), 200);
  });

  router.openapi(createSettingRoute, async (context) => {
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    const setting = await settingsService.create(body, meta);
    return context.json(successResponse('Setting created successfully', setting), 201);
  });

  router.openapi(updateSettingRoute, async (context) => {
    const { key } = context.req.valid('param');
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    const setting = await settingsService.update(key, body, meta);
    return context.json(successResponse('Setting updated successfully', setting), 200);
  });

  router.openapi(deleteSettingRoute, async (context) => {
    const { key } = context.req.valid('param');
    const { meta } = getActorMeta(context);
    await settingsService.delete(key, meta);
    return context.json({ success: true, message: 'Setting deleted successfully' }, 200);
  });

  return router;
};
