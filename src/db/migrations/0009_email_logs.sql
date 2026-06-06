CREATE TABLE IF NOT EXISTS "email_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recipient_email" varchar(255) NOT NULL,
  "subject" varchar(255) NOT NULL,
  "status" varchar(50) NOT NULL,
  "error_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_email_logs_recipient_email" ON "email_logs" ("recipient_email");
