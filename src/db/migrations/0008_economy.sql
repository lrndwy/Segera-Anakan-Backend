DO $$ BEGIN
  CREATE TYPE "movement_type" AS ENUM ('IN', 'OUT', 'ADJUSTMENT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "manifest_status" AS ENUM ('DRAFT', 'READY', 'DEPARTED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "fishermen" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "village_id" uuid NOT NULL REFERENCES "villages" ("id") ON DELETE RESTRICT,
  "full_name" varchar(255) NOT NULL,
  "phone" varchar(30),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_fishermen_village_id" ON "fishermen" ("village_id");

CREATE TABLE IF NOT EXISTS "commodity_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "commodities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category_id" uuid NOT NULL REFERENCES "commodity_categories" ("id") ON DELETE RESTRICT,
  "name" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "commodity_inventory" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fisherman_id" uuid NOT NULL REFERENCES "fishermen" ("id") ON DELETE RESTRICT,
  "commodity_id" uuid NOT NULL REFERENCES "commodities" ("id") ON DELETE RESTRICT,
  "available_weight_kg" numeric(10, 2) NOT NULL,
  "price_per_kg" numeric(12, 2) NOT NULL,
  "created_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "updated_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_commodity_inventory_fisherman_id" ON "commodity_inventory" ("fisherman_id");
CREATE INDEX IF NOT EXISTS "idx_commodity_inventory_commodity_id" ON "commodity_inventory" ("commodity_id");

CREATE TABLE IF NOT EXISTS "commodity_stock_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "inventory_id" uuid NOT NULL REFERENCES "commodity_inventory" ("id") ON DELETE CASCADE,
  "movement_type" "movement_type" NOT NULL,
  "quantity_kg" numeric(10, 2) NOT NULL,
  "previous_stock_kg" numeric(10, 2) NOT NULL,
  "new_stock_kg" numeric(10, 2) NOT NULL,
  "reference_type" varchar(100) NOT NULL,
  "reference_id" uuid,
  "notes" text,
  "created_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_commodity_stock_movements_inventory_id" ON "commodity_stock_movements" ("inventory_id");

CREATE TABLE IF NOT EXISTS "commodity_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_number" varchar(100) NOT NULL UNIQUE,
  "village_id" uuid NOT NULL REFERENCES "villages" ("id") ON DELETE RESTRICT,
  "buyer_name" varchar(255) NOT NULL,
  "buyer_phone" varchar(30) NOT NULL,
  "buyer_email" varchar(255) NOT NULL,
  "total_amount" numeric(12, 2) NOT NULL,
  "status" "commodity_order_status" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_commodity_orders_village_id" ON "commodity_orders" ("village_id");
CREATE INDEX IF NOT EXISTS "idx_commodity_orders_status" ON "commodity_orders" ("status");

CREATE TABLE IF NOT EXISTS "commodity_order_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "commodity_order_id" uuid NOT NULL REFERENCES "commodity_orders" ("id") ON DELETE CASCADE,
  "inventory_id" uuid NOT NULL REFERENCES "commodity_inventory" ("id") ON DELETE RESTRICT,
  "quantity_kg" numeric(10, 2) NOT NULL,
  "price_per_kg" numeric(12, 2) NOT NULL,
  "subtotal" numeric(12, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_commodity_order_items_order_id" ON "commodity_order_items" ("commodity_order_id");

CREATE TABLE IF NOT EXISTS "commodity_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "commodity_order_id" uuid NOT NULL REFERENCES "commodity_orders" ("id") ON DELETE CASCADE,
  "file_id" uuid NOT NULL REFERENCES "files" ("id") ON DELETE RESTRICT,
  "sender_name" varchar(255) NOT NULL,
  "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
  "notes" text,
  "verified_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "verified_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_commodity_payments_order_id" ON "commodity_payments" ("commodity_order_id");

CREATE TABLE IF NOT EXISTS "manifests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "village_id" uuid NOT NULL REFERENCES "villages" ("id") ON DELETE RESTRICT,
  "manifest_date" date NOT NULL,
  "status" "manifest_status" NOT NULL DEFAULT 'DRAFT',
  "departure_time" timestamptz,
  "estimated_arrival_time" timestamptz,
  "confirmed_by" uuid REFERENCES "users" ("id") ON DELETE SET NULL,
  "created_by" uuid NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_manifests_village_id" ON "manifests" ("village_id");

CREATE TABLE IF NOT EXISTS "manifest_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "manifest_id" uuid NOT NULL REFERENCES "manifests" ("id") ON DELETE CASCADE,
  "commodity_order_id" uuid NOT NULL UNIQUE REFERENCES "commodity_orders" ("id") ON DELETE RESTRICT,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_manifest_items_manifest_id" ON "manifest_items" ("manifest_id");

INSERT INTO "commodity_categories" ("id", "name")
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'Ikan'),
  ('a1000000-0000-4000-8000-000000000002', 'Udang')
ON CONFLICT DO NOTHING;

INSERT INTO "commodities" ("id", "category_id", "name")
VALUES
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Ikan Bandeng'),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Ikan Kakap'),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000002', 'Udang Windu')
ON CONFLICT DO NOTHING;
