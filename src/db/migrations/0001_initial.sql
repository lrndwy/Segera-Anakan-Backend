CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password_hash" text NOT NULL,
  "full_name" text NOT NULL,
  "phone_number" text,
  "profile_photo_url" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "role" text NOT NULL DEFAULT 'participant',
  "email_verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "users_role_check" CHECK ("role" IN ('participant', 'admin'))
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" ("role");

CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
  "refresh_token_hash" text NOT NULL,
  "user_agent" text,
  "ip_address" text,
  "revoked_at" timestamptz,
  "expires_at" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "auth_sessions_expires_at_idx" ON "auth_sessions" ("expires_at");
