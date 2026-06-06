import type { UserRole, UserStatus } from '../../constants';

export type AuthMeta = {
  ipAddress: string;
};

export type LoginUserResponse = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  villageId: string | null;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: LoginUserResponse;
};

export type RefreshTokenResponse = {
  accessToken: string;
  refreshToken: string;
};

export type CurrentUserResponse = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  villageId: string | null;
};
