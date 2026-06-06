import type { UserRole } from '../constants';

export type CurrentUser = {
  id: string;
  villageId: string | null;
  role: UserRole;
};
