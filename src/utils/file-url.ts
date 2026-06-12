import { env } from '../config/env';

export const buildFileDownloadUrl = (fileId: string): string => {
  const path = `${env.API_PREFIX}/files/download/${fileId}`;

  if (env.PUBLIC_API_BASE_URL) {
    return `${env.PUBLIC_API_BASE_URL.replace(/\/$/, '')}${path}`;
  }

  return path;
};
