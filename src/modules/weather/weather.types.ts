export type WeatherHourlyItem = {
  time: string;
  type: string;
  temp: number;
};

export type WeatherForecastDay = {
  date: string;
  type: string;
  temp: number;
  hum: number;
  wind: number;
  hourly: WeatherHourlyItem[];
};

export type VillageForecastDay = {
  date: string;
  type: string;
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
};

export type VillageWeatherForecast = {
  villageName: string;
  forecasts: VillageForecastDay[];
};
