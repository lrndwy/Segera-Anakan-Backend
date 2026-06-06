import { createRoute } from '@hono/zod-openapi';
import type { Context, MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException } from '../../lib/exceptions';
import { paginatedResponse, successResponse } from '../../lib/response';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { getRequestIp } from '../../utils/network';
import type { AgencyService } from './agency.service';
import {
  agencyIdParamSchema,
  agencyResponseSchema,
  createAgencySchema,
  errorEnvelopeSchema,
  listAgenciesQuerySchema,
  messageEnvelopeSchema,
  paginatedEnvelopeSchema,
  sendAgencyEmailResponseSchema,
  sendAgencyEmailSchema,
  sendAgencyWhatsAppResponseSchema,
  sendAgencyWhatsAppSchema,
  successEnvelopeSchema,
  updateAgencySchema,
} from './agency.schema';

type AgencyRouteDeps = {
  agencyService: AgencyService;
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

export const createAgenciesRouter = ({ agencyService, authMiddleware }: AgencyRouteDeps) => {
  const router = createOpenAPIRouter();
  const middleware = adminKecamatanMiddleware(authMiddleware);

  const listAgenciesRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Agency'],
    summary: 'List agencies',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { query: listAgenciesQuerySchema },
    responses: {
      200: {
        description: 'Agencies retrieved successfully',
        content: { 'application/json': { schema: paginatedEnvelopeSchema(agencyResponseSchema) } },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getAgencyRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Agency'],
    summary: 'Get agency detail',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { params: agencyIdParamSchema },
    responses: {
      200: {
        description: 'Agency retrieved successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(agencyResponseSchema) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const createAgencyRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Agency'],
    summary: 'Create agency',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { body: { content: { 'application/json': { schema: createAgencySchema } } } },
    responses: {
      201: {
        description: 'Agency created successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(agencyResponseSchema) } },
      },
      422: { description: 'Validation error' },
    },
  });

  const updateAgencyRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Agency'],
    summary: 'Update agency',
    security: [{ bearerAuth: [] }],
    middleware,
    request: {
      params: agencyIdParamSchema,
      body: { content: { 'application/json': { schema: updateAgencySchema } } },
    },
    responses: {
      200: {
        description: 'Agency updated successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(agencyResponseSchema) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const deleteAgencyRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Agency'],
    summary: 'Delete agency (soft delete)',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { params: agencyIdParamSchema },
    responses: {
      200: { description: 'Agency deleted successfully', content: { 'application/json': { schema: messageEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const sendEmailRoute = createRoute({
    method: 'post',
    path: '/{id}/send-email',
    tags: ['Agency'],
    summary: 'Send email to agency',
    security: [{ bearerAuth: [] }],
    middleware,
    request: {
      params: agencyIdParamSchema,
      body: { content: { 'application/json': { schema: sendAgencyEmailSchema } } },
    },
    responses: {
      201: {
        description: 'Email sent successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(sendAgencyEmailResponseSchema) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const sendWhatsAppRoute = createRoute({
    method: 'post',
    path: '/{id}/send-whatsapp',
    tags: ['Agency'],
    summary: 'Send WhatsApp notification via webhook',
    security: [{ bearerAuth: [] }],
    middleware,
    request: {
      params: agencyIdParamSchema,
      body: { content: { 'application/json': { schema: sendAgencyWhatsAppSchema } } },
    },
    responses: {
      201: {
        description: 'WhatsApp webhook triggered successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(sendAgencyWhatsAppResponseSchema) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  router.openapi(listAgenciesRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await agencyService.findAll(query);
    return context.json(paginatedResponse('Agencies retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getAgencyRoute, async (context) => {
    const { id } = context.req.valid('param');
    const agency = await agencyService.findById(id);
    return context.json(successResponse('Agency retrieved successfully', agency), 200);
  });

  router.openapi(createAgencyRoute, async (context) => {
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    const agency = await agencyService.create(body, meta);
    return context.json(successResponse('Agency created successfully', agency), 201);
  });

  router.openapi(updateAgencyRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    const agency = await agencyService.update(id, body, meta);
    return context.json(successResponse('Agency updated successfully', agency), 200);
  });

  router.openapi(deleteAgencyRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { meta } = getActorMeta(context);
    await agencyService.delete(id, meta);
    return context.json({ success: true, message: 'Agency deleted successfully' }, 200);
  });

  router.openapi(sendEmailRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    const result = await agencyService.sendEmail(id, body, meta);
    return context.json(successResponse('Email sent successfully', result), 201);
  });

  router.openapi(sendWhatsAppRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { meta } = getActorMeta(context);
    const result = await agencyService.sendWhatsApp(id, body, meta);
    return context.json(successResponse('WhatsApp webhook triggered successfully', result), 201);
  });

  return router;
};
