export type AuditLogListItemResponse = {
  id: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  userName: string | null;
  ipAddress: string;
  createdAt: string;
};

export type AuditLogDetailResponse = {
  id: string;
  action: string;
  module: string;
  entityType: string;
  entityId: string;
  user: {
    id: string;
    fullName: string;
  } | null;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
};

export type AuditLogSummaryResponse = {
  totalLogs: number;
  todayLogs: number;
  topModules: Array<{ module: string; count: number }>;
  topActions: Array<{ action: string; count: number }>;
};
