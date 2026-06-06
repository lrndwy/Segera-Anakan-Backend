import { createRoute } from '@hono/zod-openapi';
import type { Context, MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException } from '../../lib/exceptions';
import { paginatedResponse, successResponse } from '../../lib/response';
import { z } from '../../lib/openapi-schema';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { getRequestIp } from '../../utils/network';
import type { UserManagementService } from './user-management.service';
import {
  createUserSchema,
  errorEnvelopeSchema,
  listUsersQuerySchema,
  paginatedEnvelopeSchema,
  resetPasswordSchema,
  successEnvelopeSchema,
  updateUserSchema,
  userDetailResponseSchema,
  userIdParamSchema,
  userListItemResponseSchema,
} from './user.schema';

type UserRouteDeps = {
  userManagementService: UserManagementService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

export const createUserRouter = ({ userManagementService, authMiddleware }: UserRouteDeps) => {
  const router = createOpenAPIRouter();
  const adminOnly = roleMiddleware([UserRole.ADMIN_KECAMATAN]);
  const protectedMiddleware: MiddlewareHandler<AppEnv>[] = [authMiddleware, adminOnly];

  const listUsersRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['User Management'],
    summary: 'List users',
    security: [{ bearerAuth: [] }],
    middleware: protectedMiddleware,
    request: {
      query: listUsersQuerySchema,
    },
    responses: {
      200: {
        description: 'Users retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(userListItemResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getUserRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['User Management'],
    summary: 'Get user detail',
    security: [{ bearerAuth: [] }],
    middleware: protectedMiddleware,
    request: {
      params: userIdParamSchema,
    },
    responses: {
      200: {
        description: 'User retrieved successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(userDetailResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const createUserRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['User Management'],
    summary: 'Create user',
    security: [{ bearerAuth: [] }],
    middleware: protectedMiddleware,
    request: {
      body: {
        content: {
          'application/json': {
            schema: createUserSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'User created successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(userDetailResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      409: { description: 'Email already in use', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const updateUserRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['User Management'],
    summary: 'Update user',
    security: [{ bearerAuth: [] }],
    middleware: protectedMiddleware,
    request: {
      params: userIdParamSchema,
      body: {
        content: {
          'application/json': {
            schema: updateUserSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'User updated successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(userDetailResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const resetPasswordRoute = createRoute({
    method: 'patch',
    path: '/{id}/reset-password',
    tags: ['User Management'],
    summary: 'Reset user password',
    security: [{ bearerAuth: [] }],
    middleware: protectedMiddleware,
    request: {
      params: userIdParamSchema,
      body: {
        content: {
          'application/json': {
            schema: resetPasswordSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Password reset successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              message: z.string(),
            }),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const deleteUserRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['User Management'],
    summary: 'Soft delete user',
    security: [{ bearerAuth: [] }],
    middleware: protectedMiddleware,
    request: {
      params: userIdParamSchema,
    },
    responses: {
      200: {
        description: 'User deleted successfully',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              message: z.string(),
            }),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
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

  router.openapi(listUsersRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await userManagementService.findAll(query);
    return context.json(paginatedResponse('Users retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getUserRoute, async (context) => {
    const { id } = context.req.valid('param');
    const user = await userManagementService.findById(id);
    return context.json(successResponse('User retrieved successfully', user), 200);
  });

  router.openapi(createUserRoute, async (context) => {
    const body = context.req.valid('json');
    const user = await userManagementService.create(body, getActorMeta(context));
    return context.json(successResponse('User created successfully', user), 201);
  });

  router.openapi(updateUserRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const user = await userManagementService.update(id, body, getActorMeta(context));
    return context.json(successResponse('User updated successfully', user), 200);
  });

  router.openapi(resetPasswordRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    await userManagementService.resetPassword(id, body, getActorMeta(context));
    return context.json({ success: true, message: 'Password reset successfully' }, 200);
  });

  router.openapi(deleteUserRoute, async (context) => {
    const { id } = context.req.valid('param');
    await userManagementService.delete(id, getActorMeta(context));
    return context.json({ success: true, message: 'User deleted successfully' }, 200);
  });

  return router;
};
