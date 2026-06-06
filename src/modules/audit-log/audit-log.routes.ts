import { createRoute } from '@hono/zod-openapi';
import type { MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { paginatedResponse, successResponse } from '../../lib/response';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import {
  auditLogDetailSchema,
  auditLogIdParamSchema,
  auditLogListItemSchema,
  auditLogSummarySchema,
  errorEnvelopeSchema,
  exportAuditLogsQuerySchema,
  listAuditLogsQuerySchema,
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
} from './audit-log.schema';
import type { AuditLogQueryService } from './audit-log.service';

type AuditLogRouteDeps = {
  auditLogQueryService: AuditLogQueryService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

const adminKecamatanMiddleware = (authMiddleware: MiddlewareHandler<AppEnv>): MiddlewareHandler<AppEnv>[] => [
  authMiddleware,
  roleMiddleware([UserRole.ADMIN_KECAMATAN]),
];

export const createAuditLogRouter = ({ auditLogQueryService, authMiddleware }: AuditLogRouteDeps) => {
  const router = createOpenAPIRouter();
  const middleware = adminKecamatanMiddleware(authMiddleware);

  const listAuditLogsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Audit Log'],
    summary: 'List audit logs',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { query: listAuditLogsQuerySchema },
    responses: {
      200: {
        description: 'Audit logs retrieved successfully',
        content: { 'application/json': { schema: paginatedEnvelopeSchema(auditLogListItemSchema) } },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const summaryRoute = createRoute({
    method: 'get',
    path: '/summary',
    tags: ['Audit Log'],
    summary: 'Get audit log summary',
    security: [{ bearerAuth: [] }],
    middleware,
    responses: {
      200: {
        description: 'Audit summary retrieved',
        content: { 'application/json': { schema: successEnvelopeSchema(auditLogSummarySchema) } },
      },
    },
  });

  const exportRoute = createRoute({
    method: 'get',
    path: '/export',
    tags: ['Audit Log'],
    summary: 'Export audit logs as CSV',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { query: exportAuditLogsQuerySchema },
    responses: {
      200: {
        description: 'Audit logs exported successfully',
        content: { 'text/csv': { schema: { type: 'string' } } },
      },
    },
  });

  const getAuditLogRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Audit Log'],
    summary: 'Get audit log detail',
    security: [{ bearerAuth: [] }],
    middleware,
    request: { params: auditLogIdParamSchema },
    responses: {
      200: {
        description: 'Audit log retrieved successfully',
        content: { 'application/json': { schema: successEnvelopeSchema(auditLogDetailSchema) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(listAuditLogsRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await auditLogQueryService.findAll(query);
    return context.json(paginatedResponse('Audit logs retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(summaryRoute, async (context) => {
    const summary = await auditLogQueryService.summary();
    return context.json(successResponse('Audit summary retrieved', summary), 200);
  });

  router.openapi(exportRoute, async (context) => {
    const query = context.req.valid('query');
    const csv = await auditLogQueryService.exportCsv(query);
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  });

  router.openapi(getAuditLogRoute, async (context) => {
    const { id } = context.req.valid('param');
    const auditLog = await auditLogQueryService.findById(id);
    return context.json(successResponse('Audit log retrieved successfully', auditLog), 200);
  });

  return router;
};
