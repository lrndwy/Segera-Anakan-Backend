/** Kode wilayah adm4 BMKG — fallback jika belum ada di database */
export const DEFAULT_BMKG_REGION_CODES = [
  '33.01.24.2001', // Ujunggagak
  '33.01.24.2002', // Ujungalang
  '33.01.24.2003', // Panikel
  '33.01.24.2004', // Klaces
] as const;

/** Konversi kecepatan angin (km/jam) ke indeks ketinggian gelombang perkiraan (m) untuk skor ROB */
export const BMKG_WIND_TO_WAVE_FACTOR = 1 / 20;

/** Prakiraan cuaca BMKG tidak menyediakan pasang surut — nilai default */
export const BMKG_DEFAULT_TIDE_HEIGHT = 0;

/** Ambil prakiraan dalam rentang jam ke depan */
export const BMKG_FORECAST_HOURS_AHEAD = 24;

/** Jumlah hari prakiraan cuaca untuk endpoint publik */
export const BMKG_FORECAST_DAYS = 7;
