export type SettingsServiceMeta = {
  actorUserId: string;
  ipAddress: string;
};

export type SettingResponse = {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
};
