import { RobStatus } from '../../constants';

export type RobThresholds = {
  waveWarning: number;
  waveDanger: number;
  tideWarning: number;
  tideDanger: number;
  rainWarning: number;
  rainDanger: number;
};

export type RobMetrics = {
  waveHeight: number;
  tideHeight: number;
  rainfall: number;
};

export type RobEvaluation = RobMetrics & {
  score: number;
  status: RobStatus;
};

export const calculateRobScore = (metrics: RobMetrics, thresholds: RobThresholds): number => {
  const metricScore = (value: number, warning: number, danger: number) => {
    if (value >= danger) {
      return 2;
    }

    if (value >= warning) {
      return 1;
    }

    return 0;
  };

  return (
    metricScore(metrics.waveHeight, thresholds.waveWarning, thresholds.waveDanger) +
    metricScore(metrics.tideHeight, thresholds.tideWarning, thresholds.tideDanger) +
    metricScore(metrics.rainfall, thresholds.rainWarning, thresholds.rainDanger)
  );
};

export const determineRobStatus = (score: number): RobStatus => {
  if (score >= 4) {
    return RobStatus.BAHAYA;
  }

  if (score >= 1) {
    return RobStatus.WASPADA;
  }

  return RobStatus.AMAN;
};

export const evaluateRobMetrics = (metrics: RobMetrics, thresholds: RobThresholds): RobEvaluation => {
  const score = calculateRobScore(metrics, thresholds);

  return {
    ...metrics,
    score,
    status: determineRobStatus(score),
  };
};

export const scoreFromManualStatus = (status: RobStatus): number => {
  switch (status) {
    case RobStatus.BAHAYA:
      return 5;
    case RobStatus.WASPADA:
      return 3;
    default:
      return 0;
  }
};

export const toNumber = (value: string | number): number => {
  return typeof value === 'number' ? value : Number.parseFloat(value);
};
