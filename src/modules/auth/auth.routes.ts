import { createRoute } from '@hono/zod-openapi';
import type { MiddlewareHandler } from 'hono';

import { UnauthorizedException } from '../../lib/exceptions';
import { successResponse } from '../../lib/response';
import { z } from '../../lib/openapi-schema';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { getRequestIp } from '../../utils/network';
import {
  currentUserResponseSchema,
  errorEnvelopeSchema,
  loginResponseSchema,
  loginSchema,
  logoutSchema,
  refreshTokenResponseSchema,
  refreshTokenSchema,
  successEnvelopeSchema,
} from './auth.schema';
import type { AuthService } from './auth.service';

type AuthRouteDeps = {
  authService: AuthService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

export const createAuthRouter = ({ authService, authMiddleware }: AuthRouteDeps) => {
  const router = createOpenAPIRouter();

  const loginRoute = createRoute({
    method: 'post',
    path: '/login',
    tags: ['Auth'],
    summary: 'Login user',
    security: [],
    request: {
      body: {
        content: {
          'application/json': {
            schema: loginSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(loginResponseSchema),
          },
        },
      },
      401: {
        description: 'Invalid credentials',
        content: {
          'application/json': {
            schema: errorEnvelopeSchema,
          },
        },
      },
      403: {
        description: 'Account inactive',
        content: {
          'application/json': {
            schema: errorEnvelopeSchema,
          },
        },
      },
      422: {
        description: 'Validation error',
      },
    },
  });

  const refreshTokenRoute = createRoute({
    method: 'post',
    path: '/refresh-token',
    tags: ['Auth'],
    summary: 'Refresh access token',
    security: [],
    request: {
      body: {
        content: {
          'application/json': {
            schema: refreshTokenSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Token refreshed',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(refreshTokenResponseSchema),
          },
        },
      },
      401: {
        description: 'Invalid refresh token',
        content: {
          'application/json': {
            schema: errorEnvelopeSchema,
          },
        },
      },
      422: {
        description: 'Validation error',
      },
    },
  });

  const logoutRoute = createRoute({
    method: 'post',
    path: '/logout',
    tags: ['Auth'],
    summary: 'Logout user',
    security: [{ bearerAuth: [] }],
    middleware: [authMiddleware] as const,
    request: {
      body: {
        content: {
          'application/json': {
            schema: logoutSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Logout successful',
        content: {
          'application/json': {
            schema: z.object({
              success: z.literal(true),
              message: z.string(),
            }),
          },
        },
      },
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: errorEnvelopeSchema,
          },
        },
      },
      422: {
        description: 'Validation error',
      },
    },
  });

  const meRoute = createRoute({
    method: 'get',
    path: '/me',
    tags: ['Auth'],
    summary: 'Get current user',
    security: [{ bearerAuth: [] }],
    middleware: [authMiddleware] as const,
    responses: {
      200: {
        description: 'Current user retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(currentUserResponseSchema),
          },
        },
      },
      401: {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: errorEnvelopeSchema,
          },
        },
      },
    },
  });

  router.openapi(loginRoute, async (context) => {
    const body = context.req.valid('json');
    const result = await authService.login(body, { ipAddress: getRequestIp(context) });
    return context.json(successResponse('Login successful', result), 201);
  });

  router.openapi(refreshTokenRoute, async (context) => {
    const body = context.req.valid('json');
    const result = await authService.refreshToken(body);
    return context.json(successResponse('Token refreshed', result), 201);
  });

  router.openapi(logoutRoute, async (context) => {
    const body = context.req.valid('json');
    const currentUser = context.get('currentUser');

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    await authService.logout(body.refreshToken, currentUser.id, { ipAddress: getRequestIp(context) });
    return context.json({ success: true, message: 'Logout successful' }, 200);
  });

  router.openapi(meRoute, async (context) => {
    const currentUser = context.get('currentUser');

    if (!currentUser) {
      throw new UnauthorizedException();
    }

    const user = await authService.getCurrentUser(currentUser.id);
    return context.json(successResponse('Current user retrieved', user), 200);
  });

  return router;
};
