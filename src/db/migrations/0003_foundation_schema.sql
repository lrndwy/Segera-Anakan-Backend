-- Foundation schema migration for SegaraAnakan Hub

DO $$ BEGIN
  CREATE TYPE "user_role" AS ENUM ('ADMIN_KECAMATAN', 'ADMIN_DESA', 'KADER_DESA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "booking_status" AS ENUM (
    'PENDING_PAYMENT',
    'WAITING_VERIFICATION',
    'CONFIRMED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "commodity_order_status" AS ENUM (
    'PENDING_PAYMENT',
    'WAITING_VERIFICATION',
    'CONFIRMED',
    'WAITING_MANIFEST',
    'SHIPPED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "rob_status" AS ENUM ('AMAN', 'WASPADA', 'BAHAYA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "water_status" AS ENUM ('AMAN', 'SIAGA', 'KRITIS');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DROP TABLE IF EXISTS "auth_sessions" CASCADE;
DROP TABLE IF EXISTS "audit_logs" CASCADE;
DROP TABLE IF EXISTS "files" CASCADE;
DROP TABLE IF EXISTS "user_sessions" CASCADE;
DROP TABLE IF EXISTS "settings" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

CREATE TABLE "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "village_id" uuid,
  "full_name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "phone" text NOT NULL,
  "password_hash" text NOT NULL,
  "role" "user_role" NOT NULL,
  "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
  "refresh_token_version" integer NOT NULL DEFAULT 1,
  "last_login_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX "users_email_idx" ON "users" ("email");
CREATE INDEX "idx_users_role" ON "users" ("role");
CREATE INDEX "idx_users_village_id" ON "users" ("village_id");

CREATE TABLE "user_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "refresh_token" text NOT NULL,
  "expired_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions" ("user_id");
CREATE INDEX "user_sessions_expired_at_idx" ON "user_sessions" ("expired_at");

CREATE TABLE "files" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "bucket" text NOT NULL,
  "object_name" text NOT NULL,
  "original_name" text NOT NULL,
  "mime_type" text NOT NULL,
  "size" bigint NOT NULL,
  "url" text NOT NULL,
  "uploaded_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "files_uploaded_by_idx" ON "files" ("uploaded_by");

CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "module" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" uuid NOT NULL,
  "old_data" jsonb,
  "new_data" jsonb,
  "ip_address" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs" ("user_id");
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" ("entity_type", "entity_id");
CREATE INDEX "audit_logs_module_idx" ON "audit_logs" ("module");

CREATE TABLE "settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "key" text NOT NULL UNIQUE,
  "value" text NOT NULL,
  "description" text,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
