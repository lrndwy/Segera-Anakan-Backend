CREATE TABLE IF NOT EXISTS "rob_current_status" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "status" "rob_status" NOT NULL,
  "score" integer NOT NULL,
  "wave_height" numeric(10, 2) NOT NULL,
  "tide_height" numeric(10, 2) NOT NULL,
  "rainfall" numeric(10, 2) NOT NULL,
  "source" varchar(50) NOT NULL,
  "recorded_at" timestamptz NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "rob_histories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "status" "rob_status" NOT NULL,
  "score" integer NOT NULL,
  "wave_height" numeric(10, 2) NOT NULL,
  "tide_height" numeric(10, 2) NOT NULL,
  "rainfall" numeric(10, 2) NOT NULL,
  "notes" text,
  "recorded_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "rob_histories_recorded_at_idx" ON "rob_histories" ("recorded_at");

CREATE TABLE IF NOT EXISTS "rob_manual_overrides" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "status" "rob_status" NOT NULL,
  "reason" text NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "rob_manual_overrides_created_by_idx" ON "rob_manual_overrides" ("created_by");

CREATE TABLE IF NOT EXISTS "rob_webhook_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" varchar(100) NOT NULL,
  "payload" jsonb NOT NULL,
  "response_status" integer,
  "response_body" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "rob_webhook_logs_event_name_idx" ON "rob_webhook_logs" ("event_name");

INSERT INTO "settings" ("key", "value", "description")
VALUES
  ('ROB_WAVE_WARNING', '1.0', 'Wave height warning threshold (m)'),
  ('ROB_WAVE_DANGER', '2.0', 'Wave height danger threshold (m)'),
  ('ROB_TIDE_WARNING', '1.5', 'Tide height warning threshold (m)'),
  ('ROB_TIDE_DANGER', '2.5', 'Tide height danger threshold (m)'),
  ('ROB_RAIN_WARNING', '20', 'Rainfall warning threshold (mm)'),
  ('ROB_RAIN_DANGER', '50', 'Rainfall danger threshold (mm)'),
  ('WHATSAPP_WEBHOOK_URL', '', 'Webhook URL for ROB status notifications'),
  ('BMKG_API_URL', 'https://api.bmkg.go.id/publik/prakiraan-cuaca', 'BMKG public API base URL')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "rob_current_status" (
  "id",
  "status",
  "score",
  "wave_height",
  "tide_height",
  "rainfall",
  "source",
  "recorded_at"
)
SELECT
  '22222222-2222-4222-8222-222222222201',
  'AMAN',
  0,
  0,
  0,
  0,
  'SYSTEM',
  now()
WHERE NOT EXISTS (SELECT 1 FROM "rob_current_status" LIMIT 1);
