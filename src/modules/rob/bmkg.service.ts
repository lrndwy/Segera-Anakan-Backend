import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { SettingsService } from '../settings/settings.service';
import type { VillageRepository } from '../village/village.repository';
import {
  BMKG_DEFAULT_TIDE_HEIGHT,
  BMKG_FORECAST_HOURS_AHEAD,
  BMKG_WIND_TO_WAVE_FACTOR,
  DEFAULT_BMKG_REGION_CODES,
} from './bmkg.constants';
import type { RobMetrics } from './rob-score';

type BmkgForecastItem = {
  datetime?: string;
  tp?: number;
  ws?: number;
  t?: number;
  hu?: number;
  weather_desc?: string;
  weather_desc_en?: string;
  wd?: string;
  tcc?: number;
  vs_text?: string;
  analysis_date?: string;
  local_datetime?: string;
  utc_datetime?: string;
};

export class BmkgService {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly villageRepository: VillageRepository,
  ) {}

  async fetchMetrics(): Promise<RobMetrics> {
    const apiUrl = (await this.settingsService.get('BMKG_API_URL')) ?? env.BMKG_API_URL;
    const regionCodes = await this.resolveRegionCodes();

    if (regionCodes.length === 0) {
      logger.warn('No BMKG region codes configured, using fallback metrics');
      return this.getFallbackMetrics();
    }

    const metricsList: RobMetrics[] = [];

    for (const regionCode of regionCodes) {
      try {
        const metrics = await this.fetchMetricsForRegion(apiUrl, regionCode);
        if (metrics) {
          metricsList.push(metrics);
        }
      } catch (error) {
        logger.warn({ error, regionCode, apiUrl }, 'BMKG fetch failed for region');
      }
    }

    if (metricsList.length === 0) {
      logger.warn({ apiUrl, regionCodes }, 'BMKG fetch failed for all regions, using fallback metrics');
      return this.getFallbackMetrics();
    }

    return this.aggregateMetrics(metricsList);
  }

  private async resolveRegionCodes(): Promise<string[]> {
    const fromDb = await this.villageRepository.findAllBmkgRegionCodes();
    return fromDb.length > 0 ? fromDb : [...DEFAULT_BMKG_REGION_CODES];
  }

  private async fetchMetricsForRegion(apiUrl: string, regionCode: string): Promise<RobMetrics | null> {
    const url = new URL(apiUrl);
    url.searchParams.set('adm4', regionCode);

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`BMKG API responded with ${response.status} for adm4=${regionCode}`);
    }

    const payload: unknown = await response.json();
    return this.parseBmkgPayload(payload);
  }

  private parseBmkgPayload(payload: unknown): RobMetrics | null {
    const forecasts = this.extractForecasts(payload);

    if (forecasts.length === 0) {
      return null;
    }

    const relevant = this.filterUpcomingForecasts(forecasts);

    if (relevant.length === 0) {
      return null;
    }

    const rainfall = Math.max(...relevant.map((item) => this.readNumber(item.tp) ?? 0));
    const maxWind = Math.max(...relevant.map((item) => this.readNumber(item.ws) ?? 0));
    const waveHeight = maxWind * BMKG_WIND_TO_WAVE_FACTOR;

    return {
      rainfall,
      waveHeight,
      tideHeight: BMKG_DEFAULT_TIDE_HEIGHT,
    };
  }

  private extractForecasts(payload: unknown): BmkgForecastItem[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const data = (payload as { data?: unknown }).data;

    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    const firstEntry = data[0];

    if (!firstEntry || typeof firstEntry !== 'object') {
      return [];
    }

    const cuaca = (firstEntry as { cuaca?: unknown }).cuaca;

    if (!Array.isArray(cuaca)) {
      return [];
    }

    return cuaca.flatMap((day) => (Array.isArray(day) ? (day as BmkgForecastItem[]) : []));
  }

  private filterUpcomingForecasts(forecasts: BmkgForecastItem[]): BmkgForecastItem[] {
    const now = Date.now();
    const horizon = now + BMKG_FORECAST_HOURS_AHEAD * 60 * 60 * 1000;

    return forecasts.filter((item) => {
      const timestamp = this.parseForecastTime(item);

      if (timestamp === null) {
        return false;
      }

      return timestamp >= now - 3 * 60 * 60 * 1000 && timestamp <= horizon;
    });
  }

  private parseForecastTime(item: BmkgForecastItem): number | null {
    const candidates = [item.datetime, item.utc_datetime?.replace(' ', 'T'), item.local_datetime?.replace(' ', 'T')];

    for (const value of candidates) {
      if (!value) {
        continue;
      }

      const normalized = value.includes('T') ? value : value.replace(' ', 'T');
      const parsed = Date.parse(normalized.endsWith('Z') ? normalized : `${normalized}Z`);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  private aggregateMetrics(metricsList: RobMetrics[]): RobMetrics {
    return {
      rainfall: Math.max(...metricsList.map((m) => m.rainfall)),
      waveHeight: Math.max(...metricsList.map((m) => m.waveHeight)),
      tideHeight: Math.max(...metricsList.map((m) => m.tideHeight)),
    };
  }

  private readNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private getFallbackMetrics(): RobMetrics {
    return {
      waveHeight: 0.8,
      tideHeight: 1.2,
      rainfall: 5,
    };
  }
}
