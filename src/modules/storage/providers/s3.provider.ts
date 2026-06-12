import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { buildStoragePublicUrl, storageConfig } from '../../../config/storage';
import type { ObjectStorageProvider, PresignUploadInput, StorageObject, UploadObjectInput } from '../storage.types';

export class S3StorageProvider implements ObjectStorageProvider {
  constructor(
    private readonly s3 = new S3Client({
      region: storageConfig.region,
      endpoint: storageConfig.endpoint,
      forcePathStyle: storageConfig.forcePathStyle,
      credentials: {
        accessKeyId: storageConfig.accessKeyId,
        secretAccessKey: storageConfig.secretAccessKey,
      },
    }),
  ) {}

  async ensureBucket(bucket: string): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
    }

    await this.s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'AllowPublicRead',
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: `arn:aws:s3:::${bucket}/*`,
            },
          ],
        }),
      }),
    );
  }

  async listBuckets(): Promise<string[]> {
    const response = await this.s3.send(new ListBucketsCommand({}));
    return response.Buckets?.map((bucket) => bucket.Name).filter((name): name is string => Boolean(name)) ?? [];
  }

  async deleteBucket(bucket: string): Promise<void> {
    await this.s3.send(new DeleteBucketCommand({ Bucket: bucket }));
  }

  async uploadObject(input: UploadObjectInput): Promise<StorageObject> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return {
      bucket: input.bucket,
      key: input.key,
      url: this.buildPublicUrl(input.bucket, input.key),
    };
  }

  async getObject(bucket: string, key: string) {
    const response = await this.s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Uint8Array[] = [];

    if (!response.Body) {
      throw new Error(`Object not found: ${bucket}/${key}`);
    }

    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }

    return {
      body: Buffer.concat(chunks),
      contentType: response.ContentType ?? 'application/octet-stream',
    };
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }

  async getPresignedUploadUrl(input: PresignUploadInput): Promise<string> {
    return getSignedUrl(this.s3, new PutObjectCommand({ Bucket: input.bucket, Key: input.key, ContentType: input.contentType }), { expiresIn: input.expiresInSeconds ?? 900 });
  }

  async getPresignedDownloadUrl(input: PresignUploadInput): Promise<string> {
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: input.bucket, Key: input.key }), { expiresIn: input.expiresInSeconds ?? 900 });
  }

  private buildPublicUrl(bucket: string, key: string) {
    return buildStoragePublicUrl(bucket, key);
  }
}
