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
  commodityCatalogItemSchema,
  listCommoditiesQuerySchema,
  successEnvelopeSchema as commoditySuccessEnvelopeSchema,
} from './commodity.schema';
import type { CommodityService } from './commodity.service';
import type { CommodityInventoryService } from './commodity-inventory.service';
import type { CommodityOrderService } from './commodity-order.service';
import type { CommodityPaymentService } from './commodity-payment.service';
import type { FishermanService } from './fisherman.service';
import type { ManifestService } from './manifest.service';
import {
  addManifestItemSchema,
  adjustCommodityStockSchema,
  commodityInventoryListItemSchema,
  commodityOrderListItemSchema,
  commodityPaymentResponseSchema,
  createCommodityInventorySchema,
  createCommodityOrderResponseSchema,
  createCommodityOrderSchema,
  createCommodityPaymentSchema,
  createFishermanSchema,
  createManifestSchema,
  errorEnvelopeSchema,
  fishermanIdParamSchema,
  fishermanResponseSchema,
  inventoryIdParamSchema,
  listCommodityInventoryQuerySchema,
  listCommodityOrdersQuerySchema,
  listFishermenQuerySchema,
  listManifestsQuerySchema,
  manifestDetailSchema,
  manifestIdParamSchema,
  manifestListItemSchema,
  messageEnvelopeSchema,
  orderIdParamSchema,
  paginatedEnvelopeSchema,
  rejectCommodityPaymentSchema,
  stockMovementResponseSchema,
  successEnvelopeSchema,
  updateCommodityInventorySchema,
  updateFishermanSchema,
} from './economy.schema';
import { z } from '../../lib/openapi-schema';

type EconomyRouteDeps = {
  fishermanService: FishermanService;
  commodityInventoryService: CommodityInventoryService;
  commodityOrderService: CommodityOrderService;
  commodityPaymentService: CommodityPaymentService;
  manifestService: ManifestService;
  authMiddleware: MiddlewareHandler<AppEnv>;
};

const adminDesaMiddleware = (authMiddleware: MiddlewareHandler<AppEnv>): MiddlewareHandler<AppEnv>[] => [
  authMiddleware,
  roleMiddleware([UserRole.ADMIN_KECAMATAN, UserRole.ADMIN_DESA]),
];

const getActorMeta = (context: Context<AppEnv>) => {
  const currentUser = context.get('currentUser');
  if (!currentUser) throw new UnauthorizedException();
  return { currentUser, meta: { actorUserId: currentUser.id, ipAddress: getRequestIp(context) } };
};

const getPublicMeta = (context: Context<AppEnv>) => ({ meta: { actorUserId: null, ipAddress: getRequestIp(context) } });

export const createCommodityInventoryRouter = ({
  commodityInventoryService,
  authMiddleware,
}: Pick<EconomyRouteDeps, 'commodityInventoryService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const listRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Economy'],
    summary: 'List commodity inventory',
    security: [],
    request: { query: listCommodityInventoryQuerySchema },
    responses: {
      200: {
        description: 'Commodity inventory retrieved',
        content: { 'application/json': { schema: paginatedEnvelopeSchema(commodityInventoryListItemSchema) } },
      },
    },
  });

  const getRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Economy'],
    summary: 'Get commodity inventory detail',
    security: [],
    request: { params: inventoryIdParamSchema },
    responses: {
      200: { description: 'Commodity inventory retrieved', content: { 'application/json': { schema: successEnvelopeSchema(commodityInventoryListItemSchema) } } },
      404: { description: 'Not found', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const createRouteDef = createRoute({
    method: 'post',
    path: '/',
    tags: ['Economy'],
    summary: 'Create commodity inventory',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { body: { content: { 'application/json': { schema: createCommodityInventorySchema } } } },
    responses: {
      201: { description: 'Inventory created', content: { 'application/json': { schema: successEnvelopeSchema(commodityInventoryListItemSchema) } } },
    },
  });

  const updateRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Economy'],
    summary: 'Update commodity inventory',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: inventoryIdParamSchema, body: { content: { 'application/json': { schema: updateCommodityInventorySchema } } } },
    responses: {
      200: { description: 'Inventory updated', content: { 'application/json': { schema: successEnvelopeSchema(commodityInventoryListItemSchema) } } },
    },
  });

  const adjustRoute = createRoute({
    method: 'patch',
    path: '/{id}/adjust',
    tags: ['Economy'],
    summary: 'Manual stock adjustment',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: inventoryIdParamSchema, body: { content: { 'application/json': { schema: adjustCommodityStockSchema } } } },
    responses: {
      200: { description: 'Stock adjusted', content: { 'application/json': { schema: successEnvelopeSchema(commodityInventoryListItemSchema) } } },
    },
  });

  const movementsRoute = createRoute({
    method: 'get',
    path: '/{id}/movements',
    tags: ['Economy'],
    summary: 'List stock movements',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: inventoryIdParamSchema },
    responses: {
      200: { description: 'Stock movements retrieved', content: { 'application/json': { schema: successEnvelopeSchema(z.array(stockMovementResponseSchema)) } } },
    },
  });

  router.openapi(listRoute, async (context) => {
    const query = context.req.valid('query');
    const result = await commodityInventoryService.findAllPublic(query);
    return context.json(paginatedResponse('Commodity inventory retrieved', result.items, result.meta), 200);
  });

  router.openapi(getRoute, async (context) => {
    const { id } = context.req.valid('param');
    const item = await commodityInventoryService.findByIdPublic(id);
    return context.json(successResponse('Commodity inventory retrieved', item), 200);
  });

  router.openapi(createRouteDef, async (context) => {
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const item = await commodityInventoryService.create(body, currentUser, meta);
    return context.json(successResponse('Commodity inventory created successfully', item), 201);
  });

  router.openapi(updateRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const item = await commodityInventoryService.update(id, body, currentUser, meta);
    return context.json(successResponse('Commodity inventory updated successfully', item), 200);
  });

  router.openapi(adjustRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const item = await commodityInventoryService.adjustStock(id, body, currentUser, meta);
    return context.json(successResponse('Stock adjusted successfully', item), 200);
  });

  router.openapi(movementsRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser } = getActorMeta(context);
    const movements = await commodityInventoryService.getStockMovements(id, currentUser);
    return context.json(successResponse('Stock movements retrieved successfully', movements), 200);
  });

  return router;
};

export const createFishermenRouter = ({ fishermanService, authMiddleware }: Pick<EconomyRouteDeps, 'fishermanService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const listRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Economy'],
    summary: 'List fishermen',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { query: listFishermenQuerySchema },
    responses: { 200: { description: 'Fishermen retrieved', content: { 'application/json': { schema: paginatedEnvelopeSchema(fishermanResponseSchema) } } } },
  });

  const getRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Economy'],
    summary: 'Get fisherman',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: fishermanIdParamSchema },
    responses: { 200: { description: 'Fisherman retrieved', content: { 'application/json': { schema: successEnvelopeSchema(fishermanResponseSchema) } } } },
  });

  const createRouteDef = createRoute({
    method: 'post',
    path: '/',
    tags: ['Economy'],
    summary: 'Create fisherman',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { body: { content: { 'application/json': { schema: createFishermanSchema } } } },
    responses: { 201: { description: 'Fisherman created', content: { 'application/json': { schema: successEnvelopeSchema(fishermanResponseSchema) } } } },
  });

  const updateRoute = createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Economy'],
    summary: 'Update fisherman',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: fishermanIdParamSchema, body: { content: { 'application/json': { schema: updateFishermanSchema } } } },
    responses: { 200: { description: 'Fisherman updated', content: { 'application/json': { schema: successEnvelopeSchema(fishermanResponseSchema) } } } },
  });

  const deleteRoute = createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Economy'],
    summary: 'Delete fisherman',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: fishermanIdParamSchema },
    responses: { 200: { description: 'Fisherman deleted', content: { 'application/json': { schema: messageEnvelopeSchema } } } },
  });

  router.openapi(listRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await fishermanService.findAll(query, currentUser);
    return context.json(paginatedResponse('Fishermen retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser } = getActorMeta(context);
    const fisherman = await fishermanService.findById(id, currentUser);
    return context.json(successResponse('Fisherman retrieved successfully', fisherman), 200);
  });

  router.openapi(createRouteDef, async (context) => {
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const fisherman = await fishermanService.create(body, currentUser, meta);
    return context.json(successResponse('Fisherman created successfully', fisherman), 201);
  });

  router.openapi(updateRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const fisherman = await fishermanService.update(id, body, currentUser, meta);
    return context.json(successResponse('Fisherman updated successfully', fisherman), 200);
  });

  router.openapi(deleteRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser, meta } = getActorMeta(context);
    await fishermanService.delete(id, currentUser, meta);
    return context.json({ success: true, message: 'Fisherman deleted successfully' }, 200);
  });

  return router;
};

export const createCommodityOrdersRouter = ({ commodityOrderService, authMiddleware }: Pick<EconomyRouteDeps, 'commodityOrderService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const createRouteDef = createRoute({
    method: 'post',
    path: '/',
    tags: ['Economy'],
    summary: 'Create commodity order (public)',
    security: [],
    request: { body: { content: { 'application/json': { schema: createCommodityOrderSchema } } } },
    responses: {
      201: { description: 'Order created', content: { 'application/json': { schema: successEnvelopeSchema(createCommodityOrderResponseSchema) } } },
    },
  });

  const listRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Economy'],
    summary: 'List commodity orders',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { query: listCommodityOrdersQuerySchema },
    responses: { 200: { description: 'Orders retrieved', content: { 'application/json': { schema: paginatedEnvelopeSchema(commodityOrderListItemSchema) } } } },
  });

  const verifyRoute = createRoute({
    method: 'patch',
    path: '/{id}/verify-payment',
    tags: ['Economy'],
    summary: 'Verify commodity order payment',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: orderIdParamSchema },
    responses: { 200: { description: 'Payment verified', content: { 'application/json': { schema: messageEnvelopeSchema } } } },
  });

  const rejectRoute = createRoute({
    method: 'patch',
    path: '/{id}/reject-payment',
    tags: ['Economy'],
    summary: 'Reject commodity order payment',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: orderIdParamSchema, body: { content: { 'application/json': { schema: rejectCommodityPaymentSchema } } } },
    responses: { 200: { description: 'Payment rejected', content: { 'application/json': { schema: messageEnvelopeSchema } } } },
  });

  router.openapi(createRouteDef, async (context) => {
    const body = context.req.valid('json');
    const { meta } = getPublicMeta(context);
    const order = await commodityOrderService.createPublic(body, meta);
    return context.json(successResponse('Order created successfully', order), 201);
  });

  router.openapi(listRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await commodityOrderService.findAll(query, currentUser);
    return context.json(paginatedResponse('Commodity orders retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(verifyRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser, meta } = getActorMeta(context);
    await commodityOrderService.verifyPayment(id, currentUser, meta);
    return context.json({ success: true, message: 'Payment verified successfully' }, 200);
  });

  router.openapi(rejectRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    await commodityOrderService.rejectPayment(id, body, currentUser, meta);
    return context.json({ success: true, message: 'Payment rejected successfully' }, 200);
  });

  return router;
};

export const createCommodityPaymentsRouter = (commodityPaymentService: CommodityPaymentService) => {
  const router = createOpenAPIRouter();

  const createRouteDef = createRoute({
    method: 'post',
    path: '/',
    tags: ['Economy'],
    summary: 'Submit commodity payment proof (public)',
    security: [],
    request: { body: { content: { 'application/json': { schema: createCommodityPaymentSchema } } } },
    responses: {
      201: { description: 'Payment submitted', content: { 'application/json': { schema: successEnvelopeSchema(commodityPaymentResponseSchema) } } },
    },
  });

  router.openapi(createRouteDef, async (context) => {
    const body = context.req.valid('json');
    const { meta } = getPublicMeta(context);
    const payment = await commodityPaymentService.submitPayment(body, meta);
    return context.json(successResponse('Payment submitted successfully', payment), 201);
  });

  return router;
};

export const createManifestsRouter = ({ manifestService, authMiddleware }: Pick<EconomyRouteDeps, 'manifestService' | 'authMiddleware'>) => {
  const router = createOpenAPIRouter();

  const listRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Economy'],
    summary: 'List manifests',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { query: listManifestsQuerySchema },
    responses: { 200: { description: 'Manifests retrieved', content: { 'application/json': { schema: paginatedEnvelopeSchema(manifestListItemSchema) } } } },
  });

  const getRoute = createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Economy'],
    summary: 'Get manifest detail',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: manifestIdParamSchema },
    responses: { 200: { description: 'Manifest retrieved', content: { 'application/json': { schema: successEnvelopeSchema(manifestDetailSchema) } } } },
  });

  const createRouteDef = createRoute({
    method: 'post',
    path: '/',
    tags: ['Economy'],
    summary: 'Create manifest',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { body: { content: { 'application/json': { schema: createManifestSchema } } } },
    responses: { 201: { description: 'Manifest created', content: { 'application/json': { schema: successEnvelopeSchema(manifestDetailSchema) } } } },
  });

  const addItemRoute = createRoute({
    method: 'post',
    path: '/{id}/items',
    tags: ['Economy'],
    summary: 'Add order to manifest',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: manifestIdParamSchema, body: { content: { 'application/json': { schema: addManifestItemSchema } } } },
    responses: { 201: { description: 'Item added', content: { 'application/json': { schema: successEnvelopeSchema(manifestDetailSchema) } } } },
  });

  const departRoute = createRoute({
    method: 'patch',
    path: '/{id}/depart',
    tags: ['Economy'],
    summary: 'Depart manifest',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: manifestIdParamSchema },
    responses: { 200: { description: 'Manifest departed', content: { 'application/json': { schema: messageEnvelopeSchema } } } },
  });

  const completeRoute = createRoute({
    method: 'patch',
    path: '/{id}/complete',
    tags: ['Economy'],
    summary: 'Complete manifest',
    security: [{ bearerAuth: [] }],
    middleware: adminDesaMiddleware(authMiddleware),
    request: { params: manifestIdParamSchema },
    responses: { 200: { description: 'Manifest completed', content: { 'application/json': { schema: messageEnvelopeSchema } } } },
  });

  router.openapi(listRoute, async (context) => {
    const query = context.req.valid('query');
    const { currentUser } = getActorMeta(context);
    const result = await manifestService.findAll(query, currentUser);
    return context.json(paginatedResponse('Manifests retrieved successfully', result.items, result.meta), 200);
  });

  router.openapi(getRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser } = getActorMeta(context);
    const manifest = await manifestService.findById(id, currentUser);
    return context.json(successResponse('Manifest retrieved successfully', manifest), 200);
  });

  router.openapi(createRouteDef, async (context) => {
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const manifest = await manifestService.create(body, currentUser, meta);
    return context.json(successResponse('Manifest created successfully', manifest), 201);
  });

  router.openapi(addItemRoute, async (context) => {
    const { id } = context.req.valid('param');
    const body = context.req.valid('json');
    const { currentUser, meta } = getActorMeta(context);
    const manifest = await manifestService.addItem(id, body, currentUser, meta);
    return context.json(successResponse('Manifest item added successfully', manifest), 201);
  });

  router.openapi(departRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser, meta } = getActorMeta(context);
    await manifestService.depart(id, currentUser, meta);
    return context.json({ success: true, message: 'Manifest departed successfully' }, 200);
  });

  router.openapi(completeRoute, async (context) => {
    const { id } = context.req.valid('param');
    const { currentUser, meta } = getActorMeta(context);
    await manifestService.complete(id, currentUser, meta);
    return context.json({ success: true, message: 'Manifest completed successfully' }, 200);
  });

  return router;
};

export const createCommoditiesRouter = (commodityService: CommodityService) => {
  const router = createOpenAPIRouter();

  const listCommoditiesRoute = createRoute({
    method: 'get',
    path: '/',
    tags: ['Economy'],
    summary: 'List commodity catalog (public)',
    security: [],
    request: {
      query: listCommoditiesQuerySchema,
    },
    responses: {
      200: {
        description: 'Commodities retrieved',
        content: {
          'application/json': {
            schema: commoditySuccessEnvelopeSchema(z.array(commodityCatalogItemSchema)),
          },
        },
      },
    },
  });

  router.openapi(listCommoditiesRoute, async (context) => {
    const query = context.req.valid('query');
    const items = await commodityService.findAllPublic(query);
    return context.json(successResponse('Commodities retrieved', items), 200);
  });

  return router;
};
