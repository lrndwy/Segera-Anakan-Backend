export const REQUIRED_SETTING_KEYS = [
  'ROB_WAVE_WARNING',
  'ROB_WAVE_DANGER',
  'ROB_TIDE_WARNING',
  'ROB_TIDE_DANGER',
  'ROB_RAIN_WARNING',
  'ROB_RAIN_DANGER',
  'WATER_WARNING_PERCENT',
  'WATER_CRITICAL_PERCENT',
  'WATER_DAILY_DROP_PERCENT',
  'WHATSAPP_WEBHOOK_URL',
  'EMAIL_FROM_NAME',
  'EMAIL_FROM_ADDRESS',
  'SYSTEM_NAME',
  'SYSTEM_URL',
] as const;

export type RequiredSettingKey = (typeof REQUIRED_SETTING_KEYS)[number];

export const isRequiredSettingKey = (key: string): key is RequiredSettingKey =>
  (REQUIRED_SETTING_KEYS as readonly string[]).includes(key);
