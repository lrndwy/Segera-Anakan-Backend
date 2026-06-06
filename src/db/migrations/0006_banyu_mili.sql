DO $$ BEGIN
  CREATE TYPE "water_condition" AS ENUM ('TAWAR', 'PAYAU');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "agency_type" AS ENUM ('PDAM', 'BPBD', 'DINAS_SOSIAL', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "water_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "village_id" uuid NOT NULL REFERENCES "villages" ("id") ON DELETE RESTRICT,
  "name" varchar(255) NOT NULL,
  "location_name" varchar(255) NOT NULL,
  "latitude" numeric(10, 7) NOT NULL,
  "longitude" numeric(10, 7) NOT NULL,
  "capacity_liter" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_water_assets_village_id" ON "water_assets" ("village_id");

CREATE TABLE IF NOT EXISTS "water_reports" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "water_asset_id" uuid NOT NULL REFERENCES "water_assets" ("id") ON DELETE CASCADE,
  "submitted_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "volume_percent" integer NOT NULL,
  "water_condition" "water_condition" NOT NULL,
  "estimated_days_left" integer NOT NULL,
  "status" "water_status" NOT NULL,
  "notes" text,
  "reported_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_water_reports_asset_id" ON "water_reports" ("water_asset_id");
CREATE INDEX IF NOT EXISTS "idx_water_reports_reported_at" ON "water_reports" ("reported_at");

CREATE TABLE IF NOT EXISTS "water_alerts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "water_asset_id" uuid NOT NULL REFERENCES "water_assets" ("id") ON DELETE CASCADE,
  "status" "water_status" NOT NULL,
  "message" text NOT NULL,
  "resolved" boolean NOT NULL DEFAULT false,
  "resolved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_water_alerts_asset_id" ON "water_alerts" ("water_asset_id");
CREATE INDEX IF NOT EXISTS "idx_water_alerts_resolved" ON "water_alerts" ("resolved");

CREATE TABLE IF NOT EXISTS "agencies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "agency_type" "agency_type" NOT NULL,
  "email" varchar(255),
  "phone" varchar(30),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE TABLE IF NOT EXISTS "agency_notification_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "agency_id" uuid NOT NULL REFERENCES "agencies" ("id") ON DELETE CASCADE,
  "channel" varchar(50) NOT NULL,
  "subject" varchar(255),
  "message" text NOT NULL,
  "status" varchar(50) NOT NULL,
  "response" text,
  "created_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_agency_notification_logs_agency_id" ON "agency_notification_logs" ("agency_id");

CREATE TABLE IF NOT EXISTS "notification_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_name" varchar(100) NOT NULL,
  "channel" varchar(50) NOT NULL,
  "payload" jsonb NOT NULL,
  "status" varchar(50) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notification_logs_event_name" ON "notification_logs" ("event_name");

INSERT INTO "settings" ("key", "value", "description")
VALUES
  ('WATER_CRITICAL_PERCENT', '20', 'Volume percent threshold for KRITIS status'),
  ('WATER_SIAGA_PERCENT', '40', 'Volume percent threshold for SIAGA status'),
  ('WATER_DAILY_DROP_PERCENT', '5', 'Estimated daily volume drop percent for days-left calculation')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "agencies" ("id", "name", "agency_type", "email", "phone", "is_active")
VALUES
  ('33333333-3333-4333-8333-333333333301', 'PDAM SegaraAnakan', 'PDAM', 'pdam@example.com', '08123000001', true),
  ('33333333-3333-4333-8333-333333333302', 'BPBD Kecamatan', 'BPBD', 'bpbd@example.com', '08123000002', true)
ON CONFLICT ("id") DO NOTHING;
