import type { CurrentUser } from './current-user';

export type AppVariables = {
  requestId: string;
  currentUser: CurrentUser | null;
};

export type AppEnv = {
  Variables: AppVariables;
};
