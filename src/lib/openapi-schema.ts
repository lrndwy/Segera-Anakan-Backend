import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export { z };

export const createRouteSchema = <T extends z.ZodType>(schema: T) => schema;
