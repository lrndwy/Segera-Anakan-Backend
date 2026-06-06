import type { Database } from '../db/client';

export type TransactionClient = Parameters<Parameters<Database['transaction']>[0]>[0];

export const runTransaction = async <T>(db: Database, callback: (tx: TransactionClient) => Promise<T>): Promise<T> => {
  return db.transaction(async (tx) => callback(tx));
};
