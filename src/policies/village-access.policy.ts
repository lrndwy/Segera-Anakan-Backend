import { UserRole } from '../constants';
import { ForbiddenException } from '../lib/exceptions';
import type { CurrentUser } from '../types/current-user';

export const canAccessVillageResource = (currentUser: CurrentUser, resourceVillageId: string | null): boolean => {
  if (currentUser.role === UserRole.ADMIN_KECAMATAN) {
    return true;
  }

  if (currentUser.role === UserRole.ADMIN_DESA || currentUser.role === UserRole.KADER_DESA) {
    if (!currentUser.villageId || !resourceVillageId) {
      return false;
    }

    return currentUser.villageId === resourceVillageId;
  }

  return false;
};

export const assertVillageAccess = (currentUser: CurrentUser, resourceVillageId: string | null): void => {
  if (!canAccessVillageResource(currentUser, resourceVillageId)) {
    throw new ForbiddenException();
  }
};
