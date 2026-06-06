import Redis from 'ioredis';

import { env } from './env';

export const createRedisClient = () => {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: false,
  });
};

export const createBullMqConnection = () => {
  return {
    connection: {
      url: env.REDIS_URL,
    },
  };
};
