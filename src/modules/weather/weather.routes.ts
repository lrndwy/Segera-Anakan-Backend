import { createRoute } from '@hono/zod-openapi';

import { createOpenAPIRouter } from '../../lib/openapi-router';
import { z } from '../../lib/openapi-schema';
import { successResponse } from '../../lib/response';
import {
  errorEnvelopeSchema,
  successEnvelopeSchema,
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

  router.openapi(getForecastRoute, async (context) => {
    const forecast = await weatherService.getForecast();
    return context.json(successResponse('Prakiraan cuaca berhasil diambil', forecast), 200);
  });

  return router;
};
