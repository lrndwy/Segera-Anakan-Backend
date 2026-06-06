import type { Logger } from 'pino';

import type { RobGuardianService } from '../../rob/rob-guardian.service';

const ONE_HOUR_MS = 60 * 60 * 1000;

export const registerRobCronJob = (robGuardianService: RobGuardianService, logger: Logger) => {
  const run = async () => {
    try {
      await robGuardianService.runSyncCycle();
      logger.info('rob guardian sync cycle completed');
    } catch (error) {
      logger.error({ error }, 'rob guardian sync cycle failed');
    }
  };

  void run();

  const timer = setInterval(() => {
    void run();
  }, ONE_HOUR_MS);

  return () => {
    clearInterval(timer);
  };
};
