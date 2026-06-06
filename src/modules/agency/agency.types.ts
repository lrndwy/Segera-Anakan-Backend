import type { AgencyType } from '../../constants';

export type AgencyServiceMeta = {
  actorUserId: string;
  ipAddress: string;
};

export type AgencyResponse = {
  id: string;
  name: string;
  agencyType: AgencyType;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SendAgencyEmailResponse = {
  emailLogId: string;
  agencyNotificationLogId: string;
  status: string;
};

export type SendAgencyWhatsAppResponse = {
  notificationLogId: string;
  agencyNotificationLogId: string;
  status: string;
};
