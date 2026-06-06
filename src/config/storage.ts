import { env } from './env';

export const storageConfig = {
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  bucket: env.STORAGE_BUCKET,
  accessKeyId: env.STORAGE_ACCESS_KEY_ID,
  secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
  publicBaseUrl: env.STORAGE_PUBLIC_BASE_URL ?? env.STORAGE_ENDPOINT,
} as const;

export const buildStoragePublicUrl = (bucket: string, key: string) => {
  return `${storageConfig.publicBaseUrl.replace(/\/$/, '')}/${bucket}/${key}`;
};

export const normalizeStorageUrl = (value: string) => {
  try {
    const parsedUrl = new URL(value);
    const storageOrigin = new URL(storageConfig.endpoint).origin;

    if (parsedUrl.origin !== storageOrigin) {
      return value;
    }

    return `${storageConfig.publicBaseUrl.replace(/\/$/, '')}${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return value;
  }
};
