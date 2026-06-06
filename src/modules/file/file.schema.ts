import { z } from '../../lib/openapi-schema';

export const fileIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const uploadFileFormSchema = z.object({
  file: z.any().openapi({
    type: 'string',
    format: 'binary',
    description: 'File to upload',
  }),
});

export const fileUploadResponseSchema = z.object({
  id: z.string().uuid(),
  bucket: z.string(),
  objectName: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  url: z.string().url(),
});

export const fileDetailResponseSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
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
