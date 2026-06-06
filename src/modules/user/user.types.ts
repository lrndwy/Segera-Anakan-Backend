import type { UserRole, UserStatus } from '../../constants';

export type UserDetailResponse = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export type UserListItemResponse = UserDetailResponse & {
  phone: string;
  villageId: string | null;
};

export type ServiceMeta = {
  actorUserId: string;
  ipAddress: string;
};
