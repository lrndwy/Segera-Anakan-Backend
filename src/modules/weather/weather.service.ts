import type { SettingsService } from '../settings/settings.service';
import { VillageRepository } from '../village/village.repository';
import { BmkgService } from '../rob/bmkg.service';
import type { VillageWeatherForecast, WeatherForecastDay } from './weather.types';

export class WeatherService {
  private readonly bmkgService: BmkgService;

  constructor(settingsService: SettingsService, villageRepository: VillageRepository) {
    this.bmkgService = new BmkgService(settingsService, villageRepository);
  }

  async getForecast(): Promise<WeatherForecastDay[]> {
    return this.bmkgService.fetchWeeklyForecast();
  }

  async getVillagesForecast(): Promise<VillageWeatherForecast[]> {
    return this.bmkgService.fetchVillagesWeeklyForecast();
  }
}
