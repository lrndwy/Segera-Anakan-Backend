import { createHash, randomUUID } from 'crypto';

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const generateUuid = () => randomUUID();
