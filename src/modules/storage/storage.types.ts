export type UploadObjectInput = {
  bucket: string;
  key: string;
  body: Buffer;
  contentType?: string | undefined;
};

export type PresignUploadInput = {
  bucket: string;
  key: string;
  contentType?: string | undefined;
  expiresInSeconds?: number | undefined;
};

export type StorageObject = {
  bucket: string;
  key: string;
  url: string;
};

export interface ObjectStorageProvider {
  ensureBucket(bucket: string): Promise<void>;
  listBuckets(): Promise<string[]>;
  deleteBucket(bucket: string): Promise<void>;
  uploadObject(input: UploadObjectInput): Promise<StorageObject>;
  deleteObject(bucket: string, key: string): Promise<void>;
  getPresignedUploadUrl(input: PresignUploadInput): Promise<string>;
  getPresignedDownloadUrl(input: PresignUploadInput): Promise<string>;
}
