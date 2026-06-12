import { createRoute } from '@hono/zod-openapi';

import { createOpenAPIRouter } from '../../lib/openapi-router';
import { z } from '../../lib/openapi-schema';
import { successResponse } from '../../lib/response';
import {
  errorEnvelopeSchema,
  successEnvelopeSchema,
  villageWeatherForecastSchema,
  weatherForecastDaySchema,
} from './weather.schema';
import type { WeatherService } from './weather.service';

export const createWeatherRouter = (weatherService: WeatherService) => {
  const router = createOpenAPIRouter();

  const getForecastRoute = createRoute({
    method: 'get',
    path: '/forecast',
    tags: ['Weather'],
    summary: 'Get 7-day weather forecast',
    security: [],
    responses: {
      200: {
        description: 'Weather forecast retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(z.array(weatherForecastDaySchema)),
          },
        },
      },
      500: { description: 'Server error', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  const getVillagesForecastRoute = createRoute({
    method: 'get',
    path: '/villages-forecast',
    tags: ['Weather'],
    summary: 'Get 7-day weather forecast per village',
    security: [],
    responses: {
      200: {
        description: 'Village weather forecast retrieved',
        content: {
          'application/json': {
            schema: successEnvelopeSchema(z.array(villageWeatherForecastSchema)),
          },
        },
      },
      500: { description: 'Server error', content: { 'application/json': { schema: errorEnvelopeSchema } } },
    },
  });

  router.openapi(getForecastRoute, async (context) => {
    const forecast = await weatherService.getForecast();
    return context.json(successResponse('Prakiraan cuaca berhasil diambil', forecast), 200);
  });

  router.openapi(getVillagesForecastRoute, async (context) => {
    const forecast = await weatherService.getVillagesForecast();
    return context.json(successResponse('Prakiraan cuaca per desa berhasil diambil', forecast), 200);
  });

  return router;
};
