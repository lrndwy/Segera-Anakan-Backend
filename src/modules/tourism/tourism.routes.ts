import { createRoute } from '@hono/zod-openapi';
import type { Context, MiddlewareHandler } from 'hono';

import { UserRole } from '../../constants';
import { UnauthorizedException } from '../../lib/exceptions';
import { paginatedResponse, successResponse } from '../../lib/response';
import { roleMiddleware } from '../../middlewares/role.middleware';
import { createOpenAPIRouter } from '../../lib/openapi-router';
import type { AppEnv } from '../../types/app-env';
import { getRequestIp } from '../../utils/network';
import type { BoatOwnerService } from './boat-owner.service';
import type { BookingService } from './booking.service';
import type { DestinationService } from './destination.service';
import {
  boatOwnerIdParamSchema,
  boatOwnerResponseSchema,
  bookingIdParamSchema,
  bookingListItemResponseSchema,
  bookingPaymentResponseSchema,
  createBoatOwnerSchema,
  createBookingPaymentSchema,
  createBookingResponseSchema,
  createBookingSchema,
  createDestinationSchema,
  destinationDetailResponseSchema,
  destinationIdParamSchema,
  destinationListItemResponseSchema,
  errorEnvelopeSchema,
  listBoatOwnersQuerySchema,
  listBookingsQuerySchema,
  listDestinationsQuerySchema,
  messageEnvelopeSchema,
  paginatedEnvelopeSchema,
  successEnvelopeSchema,
  updateBoatOwnerSchema,
  updateDestinationSchema,
} from './tourism.schema';

type TourismRouteDeps = {
  destinationService: DestinationService;
  boatOwnerService: BoatOwnerService;
  bookingService: BookingService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

const adminDesaMiddleware = (authMiddleware: MiddlewareHandler<AppEnv>): MiddlewareHandler<AppEnv>[] => [
  authMiddleware,
  roleMiddleware([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA]),
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

const getPublicMeta = (context: Context<AppEnv>) => ({
  meta: {
    actorUserId: null,
    ipAddress: getRequestIp(context),
  },
});

export const createDestinationsRouter = ({ destinationService, authMiddleware }: Pick<TourismRouteDeps, 'destinationService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const listDestinationsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Tourism'],
    summary: 'List destinations',
    security: [],
    request: { query: listDestinationsQuerySchema },
    responses: {
      200: {
        description: 'Destinations retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(destinationListItemResponseSchema),
          },
        },
      },
    },
  });

  const getDestinationRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Tourism'],
    summary: 'Get destination detail',
    security: [],
    request: { params: destinationIdParamSchema },
    responses: {
      200: {
        description: 'Destination retrieved successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(destinationDetailResponseSchema),
          },
        },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const createDestinationRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Tourism'],
    summary: 'Create destination',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: {
      body: { content: { 'application/json': { schema: createDestinationSchema } } },
    },
    responses: {
      201: {
        description: 'Destination created successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(destinationDetailResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const updateDestinationRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Tourism'],
    summary: 'Update destination',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: {
      params: destinationIdParamSchema,
      body: { content: { 'application/json': { schema: updateDestinationSchema } } },
    },
    responses: {
      200: {
        description: 'Destination updated successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(destinationDetailResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const deleteDestinationRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Tourism'],
    summary: 'Delete destination',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: destinationIdParamSchema },
    responses: {
      200: {
        description: 'Destination deleted successfully',
        content: { 'application/json': { schema: messageEnvelopeSchema } },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(listDestinationsRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await destinationService.findAllPublic(query);
    return context.json(paginatedResponse('Destinations retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getDestinationRoute, async (context) => {
    const { id } = context.req.valid('param');
    const destination = await destinationService.findByIdPublic(id);
    return context.json(successResponse('Destination retrieved successfully', destination), 200);
  });

  router.openapi(createDestinationRoute, async (context) => {
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const destination = await destinationService.create(body, currentUser, meta);
    return context.json(successResponse('Destination created successfully', destination), 201);
  });

  router.openapi(updateDestinationRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const destination = await destinationService.update(id, body, currentUser, meta);
    return context.json(successResponse('Destination updated successfully', destination), 200);
  });

  router.openapi(deleteDestinationRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser, meta } = getActorMeta(context);
    await destinationService.delete(id, currentUser, meta);
    return context.json({ success: true, message: 'Destination deleted successfully' }, 200);
  });

  return router;
};

export const createBoatOwnersRouter = ({ boatOwnerService, authMiddleware }: Pick<TourismRouteDeps, 'boatOwnerService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const listBoatOwnersRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Tourism'],
    summary: 'List boat owners',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { query: listBoatOwnersQuerySchema },
    responses: {
      200: {
        description: 'Boat owners retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(boatOwnerResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getBoatOwnerRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Tourism'],
    summary: 'Get boat owner detail',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: boatOwnerIdParamSchema },
    responses: {
      200: {
        description: 'Boat owner retrieved successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(boatOwnerResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const createBoatOwnerRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Tourism'],
    summary: 'Create boat owner',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: {
      body: { content: { 'application/json': { schema: createBoatOwnerSchema } } },
    },
    responses: {
      201: {
        description: 'Boat owner created successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(boatOwnerResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const updateBoatOwnerRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Tourism'],
    summary: 'Update boat owner',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: {
      params: boatOwnerIdParamSchema,
      body: { content: { 'application/json': { schema: updateBoatOwnerSchema } } },
    },
    responses: {
      200: {
        description: 'Boat owner updated successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(boatOwnerResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const deleteBoatOwnerRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Tourism'],
    summary: 'Delete boat owner',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: boatOwnerIdParamSchema },
    responses: {
      200: {
        description: 'Boat owner deleted successfully',
        content: { 'application/json': { schema: messageEnvelopeSchema } },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(listBoatOwnersRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await boatOwnerService.findAll(query, currentUser);
    return context.json(paginatedResponse('Boat owners retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getBoatOwnerRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser } = getActorMeta(context);
    const owner = await boatOwnerService.findById(id, currentUser);
    return context.json(successResponse('Boat owner retrieved successfully', owner), 200);
  });

  router.openapi(createBoatOwnerRoute, async (context) => {
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const owner = await boatOwnerService.create(body, currentUser, meta);
    return context.json(successResponse('Boat owner created successfully', owner), 201);
  });

  router.openapi(updateBoatOwnerRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const owner = await boatOwnerService.update(id, body, currentUser, meta);
    return context.json(successResponse('Boat owner updated successfully', owner), 200);
  });

  router.openapi(deleteBoatOwnerRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser, meta } = getActorMeta(context);
    await boatOwnerService.delete(id, currentUser, meta);
    return context.json({ success: true, message: 'Boat owner deleted successfully' }, 200);
  });

  return router;
};

export const createBookingsRouter = ({ bookingService, authMiddleware }: Pick<TourismRouteDeps, 'bookingService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const createBookingRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Tourism'],
    summary: 'Create booking (public)',
    security: [],
    request: {
      body: { content: { 'application/json': { schema: createBookingSchema } } },
    },
    responses: {
      201: {
        description: 'Booking created successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(createBookingResponseSchema),
          },
        },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  const listBookingsRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Tourism'],
    summary: 'List bookings',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { query: listBookingsQuerySchema },
    responses: {
      200: {
        description: 'Bookings retrieved successfully',
        content: {
          'application/json': {
            schema: paginatedEnvelopeSchema(bookingListItemResponseSchema),
          },
        },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const verifyPaymentRoute = createRoute({
    method: 'patch',
    path: '/{id}/verify-payment',
    tags: ['Tourism'],
    summary: 'Verify booking payment',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: bookingIdParamSchema },
    responses: {
      200: {
        description: 'Booking payment verified successfully',
        content: { 'application/json': { schema: messageEnvelopeSchema } },
      },
      401: { description: 'Unauthorized', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      403: { description: 'Forbidden', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  router.openapi(createBookingRoute, async (context) => {
    const body = context.req.valid('json');
    const { meta } = getPublicMeta(context);
    const booking = await bookingService.createPublic(body, meta);
    return context.json(successResponse('Booking created successfully', booking), 201);
  });

  router.openapi(listBookingsRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await bookingService.findAll(query, currentUser);
    return context.json(paginatedResponse('Bookings retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(verifyPaymentRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser, meta } = getActorMeta(context);
    await bookingService.verifyPayment(id, currentUser, meta);
    return context.json({ success: true, message: 'Booking payment verified successfully' }, 200);
  });

  return router;
};

export const createBookingPaymentsRouter = (bookingService: BookingService) => {
  const router = createOpenAPIRouter();

  const createBookingPaymentRoute = createRoute({
    method: 'post',
    path: '/',
    tags: ['Tourism'],
    summary: 'Submit booking payment proof (public)',
    security: [],
    request: {
      body: { content: { 'application/json': { schema: createBookingPaymentSchema } } },
    },
    responses: {
      201: {
        description: 'Booking payment submitted successfully',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(bookingPaymentResponseSchema),
          },
        },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
      422: { description: 'Validation error' },
    },
  });

  router.openapi(createBookingPaymentRoute, async (context) => {
    const body = context.req.valid('json');
    const { meta } = getPublicMeta(context);
    const payment = await bookingService.submitPayment(body, meta);
    return context.json(successResponse('Booking payment submitted successfully', payment), 201);
  });

  return router;
};
