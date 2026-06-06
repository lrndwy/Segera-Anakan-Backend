INSERT INTO "settings" ("key", "value", "description")
SELECT 'WATER_WARNING_PERCENT', "value", 'Volume percent threshold for SIAGA status'
FROM "settings"
WHERE "key" = 'WATER_SIAGA_PERCENT'
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "settings" ("key", "value", "description")
VALUES
  ('WATER_WARNING_PERCENT', '40', 'Volume percent threshold for SIAGA status'),
  ('WHATSAPP_WEBHOOK_URL', '', 'WhatsApp webhook URL for external notification service'),
  ('EMAIL_FROM_NAME', 'SegaraAnakan Hub', 'Default sender name for system emails'),
  ('EMAIL_FROM_ADDRESS', 'noreply@segaraanakan.local', 'Default sender email address'),
  ('SYSTEM_NAME', 'SegaraAnakan Hub', 'Application display name'),
  ('SYSTEM_URL', 'http://localhost:3000', 'Application base URL')
ON CONFLICT ("key") DO NOTHING;
