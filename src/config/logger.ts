import pino from 'pino';

import { env } from './env';

export const logger = pino({
  level: env.isProduction ? 'info' : 'debug',
  base: {
    app: env.APP_NAME,
  },
});
