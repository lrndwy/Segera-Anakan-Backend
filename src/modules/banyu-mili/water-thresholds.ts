import { NotFoundException } from '../../lib/exceptions';
import type { SettingsService } from '../settings/settings.service';
import type { WaterThresholds } from './water-status.calculator';

export const getWaterThresholds = async (settingsService: SettingsService): Promise<WaterThresholds> => {
  const criticalPercent = await settingsService.getNumber('WATER_CRITICAL_PERCENT');
  const warningPercent = await settingsService.getNumber('WATER_WARNING_PERCENT');
  const dailyDropPercent = await settingsService.getNumber('WATER_DAILY_DROP_PERCENT');

  if (criticalPercent === null || warningPercent === null || dailyDropPercent === null) {
    throw new NotFoundException('Water threshold settings are not configured');
  }

  return { criticalPercent, warningPercent, dailyDropPercent };
};
