import { z } from '../../lib/openapi-schema';

export const weatherHourlyItemSchema = z.object({
  time: z.string(),
  type: z.string(),
  temp: z.number().int(),
});

export const weatherForecastDaySchema = z.object({
  date: z.string(),
  type: z.string(),
  temp: z.number().int(),
  hum: z.number().int(),
  wind: z.number().int(),
  hourly: z.array(weatherHourlyItemSchema),
});

export const villageForecastDaySchema = z.object({
  date: z.string(),
  type: z.string(),
  tempMin: z.number().int(),
  tempMax: z.number().int(),
  humMin: z.number().int(),
  humMax: z.number().int(),
});

export const villageWeatherForecastSchema = z.object({
  villageName: z.string(),
  forecasts: z.array(villageForecastDaySchema),
});

export const successEnvelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });

export const errorEnvelopeSchema = z.object({
  success: z.literal(false),
  message: z.string(),
});
