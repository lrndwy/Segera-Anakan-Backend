export type FileUploadResponse = {
  id: string;
  bucket: string;
  objectName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type FileDetailResponse = {
  id: string;
  url: string;
};

export type FileServiceMeta = {
  actorUserId: string;
  ipAddress: string;
};
