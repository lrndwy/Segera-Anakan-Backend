import { env } from '../config/env';

export const openApiInfo = {
  openapi: '3.1.0',
  info: {
    title: env.APP_NAME,
    version: '1.0.0',
    description: 'SegaraAnakan Hub API',
  },
  servers: [
    {
      url: env.API_PREFIX,
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ bearerAuth: [] }],
} as const;

export const registerOpenApiRoute = (document: Record<string, unknown>, route: {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  summary: string;
  tags?: string[];
  security?: Record<string, unknown>[];
}) => {
  const paths = (document.paths ?? {}) as Record<string, Record<string, unknown>>;

  if (!paths[route.path]) {
    paths[route.path] = {};
  }

  paths[route.path]![route.method] = {
    summary: route.summary,
    ...(route.tags ? { tags: route.tags } : {}),
    ...(route.security ? { security: route.security } : {}),
    responses: {
      200: {
        description: 'Success',
      },
    },
  };

  document.paths = paths;
};

export const createOpenApiDocument = () => {
  const document: Record<string, unknown> = {
    ...openApiInfo,
    paths: {},
  };

  registerOpenApiRoute(document, {
    method: 'get',
    path: '/health',
    summary: 'Health check',
    tags: ['System'],
    security: [],
  });

  registerOpenApiRoute(document, {
    method: 'get',
    path: '/ready',
    summary: 'Readiness check',
    tags: ['System'],
    security: [],
  });

  return document;
};
