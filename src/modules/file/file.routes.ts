import { createRoute } from '@hono/zod-openapi';
import type { Context, MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException, ValidationException } from '../../lib/exceptions';
import { successResponse } from '../../lib/response';
import { z } from '../../lib/openapi-schema';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { getRequestIp } from '../../utils/network';
import {
  errorEnvelopeSchema,
  fileDetailResponseSchema,
  fileIdParamSchema,
  fileUploadResponseSchema,
  successEnvelopeSchema,
  uploadFileFormSchema,
} from './file.schema';
import type { FileService } from './file.service';

type FileRouteDeps = {
  fileService: FileService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

const isUploadableFile = (value: unknown): value is File => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as File).arrayBuffer === 'function'
  );
};

export const createFileRouter = ({ fileService, authMiddleware }: FileRouteDeps) => {
  const router = createOpenAPIRouter();
  const allRolesMiddleware: MiddlewareHandler<AppEnv>[] = [
    authMiddleware,
    roleMiddleware([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA, UserRole.KADER_DESA]),
  ];
  const deleteRolesMiddleware: MiddlewareHandler<AppEnv>[] = [
    authMiddleware,
    roleMiddleware([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA]),
  ];

  const uploadRoute = createRoute({
    method: 'post',
    path: '/upload',
    tags: ['File Upload'],
    summary: 'Upload file',
    security: [{ bearerAuth: [] }],
    middleware: allRolesMiddleware,
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: uploadFileFormSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'File uploaded successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(fileUploadResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getFileRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['File Upload'],
    summary: 'Get file detail',
    security: [{ bearerAuth: [] }],
    middleware: allRolesMiddleware,
    request: {
      params: fileIdParamSchema,
    },
    responses: {
      200: {
        description: 'File retrieved successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(fileDetailResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const downloadFileRoute = createRoute({
    method: 'get',
    path: '/download/{id}',
    tags: ['File Upload'],
    summary: 'Download file (public proxy)',
    security: [],
    request: {
      params: fileIdParamSchema,
    },
    responses: {
      200: {
        description: 'File binary stream',
        content: {
          'application/octet-stream': {
            schema: z.string().openapi({ type: 'string', format: 'binary' }),
          },
        },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const deleteFileRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['File Upload'],
    summary: 'Delete file',
    security: [{ bearerAuth: [] }],
    middleware: deleteRolesMiddleware,
    request: {
      params: fileIdParamSchema,
    },
    responses: {
      200: {
        description: 'File deleted successfully',
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
      currentUser,
      meta: {
        actorUserId: currentUser.id,
        ipAddress: getRequestIp(context),
      },
    };
  };

  router.openapi(downloadFileRoute, async (context) => {
    const { id } = context.req.valid('param');
    const file = await fileService.downloadPublic(id);

    return new Response(new Uint8Array(file.body), {
      status: 200,
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': `inline; filename="${file.originalName}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  });

  router.openapi(getFileRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser } = getActorMeta(context);
    const file = await fileService.findById(id, currentUser);
    return context.json(successResponse('File retrieved successfully', file), 200);
  });

  router.openapi(uploadRoute, async (context) => {
    const { currentUser, meta } = getActorMeta(context);
    const form = context.req.valid('form');
    const fileField = form.file;

    if (!isUploadableFile(fileField)) {
      throw new ValidationException('Validation failed', [{ field: 'file', message: 'File is required' }]);
    }

    const buffer = Buffer.from(await fileField.arrayBuffer());
    const payload = {
      fileName: fileField.name || 'upload.bin',
      mimeType: fileField.type || 'application/octet-stream',
      size: buffer.byteLength,
      buffer,
    };
    const result = await fileService.upload(payload, currentUser, meta);
    return context.json(successResponse('File uploaded successfully', result), 201);
  });

  router.openapi(deleteFileRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser, meta } = getActorMeta(context);
    await fileService.delete(id, currentUser, meta);
    return context.json({ success: true, message: 'File deleted successfully' }, 200);
  });

  return router;
};
