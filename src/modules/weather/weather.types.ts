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
