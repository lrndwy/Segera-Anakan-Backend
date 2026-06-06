import { WaterStatus } from '../../constants';

export type WaterThresholds = {
  criticalPercent: number;
  warningPercent: number;
  dailyDropPercent: number;
};

export const calculateWaterStatus = (volumePercent: number, thresholds: Pick<WaterThresholds, 'criticalPercent' | 'warningPercent'>): WaterStatus => {
  if (volumePercent <= thresholds.criticalPercent) {
    return WaterStatus.KRITIS;
  }

  if (volumePercent <= thresholds.warningPercent) {
    return WaterStatus.SIAGA;
  }

  return WaterStatus.AMAN;
};

export const calculateEstimatedDaysLeft = (volumePercent: number, dailyDropPercent: number): number => {
  if (volumePercent <= 0) {
    return 0;
  }

  if (dailyDropPercent <= 0) {
    return volumePercent;
  }

  return Math.max(1, Math.ceil(volumePercent / dailyDropPercent));
};
