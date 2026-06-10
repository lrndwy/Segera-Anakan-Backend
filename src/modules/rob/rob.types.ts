import type { RobStatus } from '../../constants';

export type RobStatusResponse = {
  status: RobStatus;
  score: number;
  waveHeight: number;
  tideHeight: number;
  rainfall: number;
  recordedAt: string;
};

export type RobHistoryItemResponse = {
  id: string;
  status: RobStatus;
  score: number;
  waveHeight: number;
  tideHeight: number;
  rainfall: number;
  notes: string | null;
  recordedAt: string;
};

export type RobServiceMeta = {
  actorUserId: string;
  ipAddress: string;
};

export type RobVillageStatusItem = {
  villageId: string;
  villageName: string;
  status: RobStatus;
  waterLevel: number;
};

export type RobVillagesStatusResponse = {
  status: RobStatus;
  score: number;
  waveHeight: number;
  villages: RobVillageStatusItem[];
};
