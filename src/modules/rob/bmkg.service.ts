import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { SettingsService } from '../settings/settings.service';
import type { VillageRepository } from '../village/village.repository';
import type { VillageForecastDay, VillageWeatherForecast, WeatherForecastDay, WeatherHourlyItem } from '../weather/weather.types';
import {
  BMKG_DEFAULT_TIDE_HEIGHT,
  BMKG_FORECAST_DAYS,
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

  async fetchMetricsForRegion(regionCode: string): Promise<RobMetrics> {
    const apiUrl = (await this.settingsService.get('BMKG_API_URL')) ?? env.BMKG_API_URL;

    try {
      const metrics = await this.fetchMetricsForRegionInternal(apiUrl, regionCode);
      return metrics ?? this.getFallbackMetrics();
    } catch (error) {
      logger.warn({ error, regionCode, apiUrl }, 'BMKG fetch failed for region, using fallback metrics');
      return this.getFallbackMetrics();
    }
  }

  async fetchVillagesWeeklyForecast(): Promise<VillageWeatherForecast[]> {
    const villages = await this.villageRepository.findAllWithBmkgRegion();

    if (villages.length === 0) {
      const fallback = this.getFallbackVillageMatrixForecast('Kampung Laut');
      return [fallback];
    }

    const apiUrl = (await this.settingsService.get('BMKG_API_URL')) ?? env.BMKG_API_URL;
    const results: VillageWeatherForecast[] = [];

    for (const village of villages) {
      try {
        const payload = await this.fetchRegionPayload(apiUrl, village.bmkgRegionCode);
        const forecasts = this.parseVillageMatrixForecast(payload);

        results.push({
          villageName: village.name,
          forecasts: forecasts.length > 0 ? forecasts : this.getFallbackVillageMatrixForecast(village.name).forecasts,
        });
      } catch (error) {
        logger.warn({ error, village: village.name, regionCode: village.bmkgRegionCode }, 'BMKG village forecast fetch failed, using fallback');
        results.push(this.getFallbackVillageMatrixForecast(village.name));
      }
    }

    return results;
  }

  async fetchWeeklyForecast(): Promise<WeatherForecastDay[]> {
    const apiUrl = (await this.settingsService.get('BMKG_API_URL')) ?? env.BMKG_API_URL;
    const regionCodes = await this.resolveRegionCodes();
    const regionCode = regionCodes[0];

    if (!regionCode) {
      return this.getFallbackForecast();
    }

    try {
      const payload = await this.fetchRegionPayload(apiUrl, regionCode);
      const forecast = this.parseWeeklyForecast(payload);

      if (forecast.length > 0) {
        return forecast;
      }
    } catch (error) {
      logger.warn({ error, regionCode, apiUrl }, 'BMKG weekly forecast fetch failed, using fallback');
    }

    return this.getFallbackForecast();
  }

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
        const metrics = await this.fetchMetricsForRegionInternal(apiUrl, regionCode);
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

  private async fetchRegionPayload(apiUrl: string, regionCode: string): Promise<unknown> {
    const url = new URL(apiUrl);
    url.searchParams.set('adm4', regionCode);

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`BMKG API responded with ${response.status} for adm4=${regionCode}`);
    }

    return response.json();
  }

  private async fetchMetricsForRegionInternal(apiUrl: string, regionCode: string): Promise<RobMetrics | null> {
    const payload = await this.fetchRegionPayload(apiUrl, regionCode);
    return this.parseBmkgPayload(payload);
  }

  private parseVillageMatrixForecast(payload: unknown): VillageForecastDay[] {
    const dayForecasts = this.extractDailyForecasts(payload);

    return dayForecasts.slice(0, BMKG_FORECAST_DAYS).map((dayItems) => {
      const temps = dayItems.map((item) => this.readNumber(item.t) ?? 26);
      const humidities = dayItems.map((item) => this.readNumber(item.hu) ?? 0).filter((value) => value > 0);
      const types = dayItems.map((item) => this.normalizeWeatherType(item.weather_desc ?? item.weather_desc_en));

      return {
        date: this.extractForecastDate(dayItems[0]),
        type: this.resolveDominantWeatherType(types),
        tempMin: temps.length === 0 ? 26 : Math.min(...temps),
        tempMax: temps.length === 0 ? 30 : Math.max(...temps),
        humMin: humidities.length === 0 ? 70 : Math.min(...humidities),
        humMax: humidities.length === 0 ? 90 : Math.max(...humidities),
      };
    });
  }

  private getFallbackVillageMatrixForecast(villageName: string): VillageWeatherForecast {
    const today = new Date();

    return {
      villageName,
      forecasts: Array.from({ length: BMKG_FORECAST_DAYS }, (_, index) => {
        const date = new Date(today);
        date.setUTCDate(today.getUTCDate() + index);

        return {
          date: date.toISOString().slice(0, 10),
          type: index % 2 === 0 ? 'Cerah' : 'Berawan',
          tempMin: 22,
          tempMax: 29,
          humMin: 66,
          humMax: 97,
        };
      }),
    };
  }

  private parseWeeklyForecast(payload: unknown): WeatherForecastDay[] {
    const dayForecasts = this.extractDailyForecasts(payload);

    return dayForecasts.slice(0, BMKG_FORECAST_DAYS).map((dayItems) => {
      const hourly: WeatherHourlyItem[] = dayItems.map((item) => ({
        time: this.formatForecastTime(item),
        type: this.normalizeWeatherType(item.weather_desc ?? item.weather_desc_en),
        temp: Math.round(this.readNumber(item.t) ?? 26),
      }));

      const temps = hourly.map((item) => item.temp);
      const humidities = dayItems.map((item) => this.readNumber(item.hu) ?? 0).filter((value) => value > 0);
      const winds = dayItems.map((item) => this.readNumber(item.ws) ?? 0);

      return {
        date: this.extractForecastDate(dayItems[0]),
        type: this.resolveDominantWeatherType(hourly.map((item) => item.type)),
        temp: temps.length === 0 ? 26 : Math.round(temps.reduce((sum, value) => sum + value, 0) / temps.length),
        hum: humidities.length === 0 ? 80 : Math.round(humidities.reduce((sum, value) => sum + value, 0) / humidities.length),
        wind: winds.length === 0 ? 10 : Math.round(Math.max(...winds)),
        hourly,
      };
    });
  }

  private extractDailyForecasts(payload: unknown): BmkgForecastItem[][] {
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

    return cuaca.filter((day): day is BmkgForecastItem[] => Array.isArray(day) && day.length > 0);
  }

  private extractForecastDate(item: BmkgForecastItem | undefined): string {
    const timestamp = item ? this.parseForecastTime(item) : null;

    if (timestamp !== null) {
      return new Date(timestamp).toISOString().slice(0, 10);
    }

    return new Date().toISOString().slice(0, 10);
  }

  private formatForecastTime(item: BmkgForecastItem): string {
    const timestamp = this.parseForecastTime(item);

    if (timestamp === null) {
      return '00:00';
    }

    const date = new Date(timestamp);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private normalizeWeatherType(description: string | undefined): string {
    if (!description) {
      return 'Berawan';
    }

    const normalized = description.trim().toLowerCase();

    if (normalized.includes('cerah') || normalized.includes('clear') || normalized.includes('sunny')) {
      return 'Cerah';
    }

    if (normalized.includes('hujan') || normalized.includes('rain') || normalized.includes('petir') || normalized.includes('thunder')) {
      return 'Hujan';
    }

    if (normalized.includes('berawan') || normalized.includes('cloud') || normalized.includes('mendung')) {
      return 'Berawan';
    }

    return description.trim();
  }

  private resolveDominantWeatherType(types: string[]): string {
    if (types.length === 0) {
      return 'Berawan';
    }

    const counts = new Map<string, number>();

    for (const type of types) {
      counts.set(type, (counts.get(type) ?? 0) + 1);
    }

    return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'Berawan';
  }

  private getFallbackForecast(): WeatherForecastDay[] {
    const today = new Date();

    return Array.from({ length: BMKG_FORECAST_DAYS }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() + index);
      const dateLabel = date.toISOString().slice(0, 10);

      return {
        date: dateLabel,
        type: index % 2 === 0 ? 'Cerah' : 'Berawan',
        temp: 30,
        hum: 80,
        wind: 15,
        hourly: [
          { time: '06:00', type: 'Cerah', temp: 26 },
          { time: '12:00', type: 'Berawan', temp: 32 },
        ],
      };
    });
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
