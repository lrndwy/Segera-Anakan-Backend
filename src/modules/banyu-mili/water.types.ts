import type { WaterCondition, WaterStatus } from '../../constants';

export type BanyuMiliServiceMeta = {
  actorUserId: string;
  ipAddress: string;
};

export type VillageWaterStatusResponse = {
  villageId: string;
  villageName: string;
  status: WaterStatus;
  lastUpdated: string;
};

export type WaterPublicAssetResponse = {
  id: string;
  name: string;
  locationName: string;
  capacityLiter: number;
  villageId: string;
  villageName: string;
};

export type WaterAssetResponse = {
  id: string;
  villageId: string;
  name: string;
  locationName: string;
  latitude: number;
  longitude: number;
  capacityLiter: number;
  isActive: boolean;
};

export type WaterReportResponse = {
  id: string;
  waterAssetId: string;
  submittedBy: string;
  volumePercent: number;
  waterCondition: WaterCondition;
  estimatedDaysLeft: number;
  status: WaterStatus;
  notes: string | null;
  reportedAt: string;
};

export type WaterAlertResponse = {
  id: string;
  waterAssetId: string;
  status: WaterStatus;
  message: string;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
};
