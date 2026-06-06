DO $$ BEGIN
  CREATE TYPE "boat_assignment_status" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "destinations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "village_id" uuid NOT NULL REFERENCES "villages" ("id") ON DELETE RESTRICT,
  "name" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "price_per_person" numeric(12, 2) NOT NULL,
  "capacity_per_day" integer NOT NULL,
  "max_people_per_booking" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "updated_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_destinations_village_id" ON "destinations" ("village_id");

CREATE TABLE IF NOT EXISTS "destination_images" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "destination_id" uuid NOT NULL REFERENCES "destinations" ("id") ON DELETE CASCADE,
  "file_id" uuid NOT NULL REFERENCES "files" ("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_destination_images_destination_id" ON "destination_images" ("destination_id");

CREATE TABLE IF NOT EXISTS "boat_owners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "village_id" uuid NOT NULL REFERENCES "villages" ("id") ON DELETE RESTRICT,
  "full_name" varchar(255) NOT NULL,
  "phone" varchar(30) NOT NULL,
  "boat_name" varchar(255) NOT NULL,
  "boat_capacity" integer NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "last_assigned_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_boat_owners_village_id" ON "boat_owners" ("village_id");

CREATE TABLE IF NOT EXISTS "bookings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_number" varchar(100) NOT NULL UNIQUE,
  "village_id" uuid NOT NULL REFERENCES "villages" ("id") ON DELETE RESTRICT,
  "destination_id" uuid NOT NULL REFERENCES "destinations" ("id") ON DELETE RESTRICT,
  "customer_name" varchar(255) NOT NULL,
  "customer_email" varchar(255) NOT NULL,
  "customer_phone" varchar(30) NOT NULL,
  "booking_date" date NOT NULL,
  "total_people" integer NOT NULL,
  "total_amount" numeric(12, 2) NOT NULL,
  "status" "booking_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bookings_village_id" ON "bookings" ("village_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_destination_id" ON "bookings" ("destination_id");
CREATE INDEX IF NOT EXISTS "idx_bookings_status" ON "bookings" ("status");

CREATE TABLE IF NOT EXISTS "booking_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL REFERENCES "bookings" ("id") ON DELETE CASCADE,
  "file_id" uuid NOT NULL REFERENCES "files" ("id") ON DELETE RESTRICT,
  "sender_name" varchar(255) NOT NULL,
  "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
  "notes" text,
  "verified_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_booking_payments_booking_id" ON "booking_payments" ("booking_id");

CREATE TABLE IF NOT EXISTS "boat_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "booking_id" uuid NOT NULL REFERENCES "bookings" ("id") ON DELETE CASCADE,
  "boat_owner_id" uuid NOT NULL REFERENCES "boat_owners" ("id") ON DELETE RESTRICT,
  "assigned_people" integer NOT NULL,
  "status" "boat_assignment_status" NOT NULL DEFAULT 'CONFIRMED',
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  "assigned_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_boat_assignments_booking_id" ON "boat_assignments" ("booking_id");
CREATE INDEX IF NOT EXISTS "idx_boat_assignments_boat_owner_id" ON "boat_assignments" ("boat_owner_id");
