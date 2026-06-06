export type VillageListItemResponse = {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
};

export type VillageQrisResponse = {
  id: string;
  url: string;
};

export type VillageDetailResponse = {
  id: string;
  name: string;
  description: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  qris: VillageQrisResponse | null;
};

export type VillageServiceMeta = {
  actorUserId: string;
  ipAddress: string;
};
