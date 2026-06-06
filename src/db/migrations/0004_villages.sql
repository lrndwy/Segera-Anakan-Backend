CREATE TABLE IF NOT EXISTS "villages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "qris_file_id" uuid REFERENCES "files" ("id") ON DELETE SET NULL,
  "contact_name" varchar(255) NOT NULL,
  "contact_phone" varchar(30) NOT NULL,
  "contact_email" varchar(255) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "deleted_at" timestamptz
);

CREATE INDEX IF NOT EXISTS "idx_villages_name" ON "villages" ("name");

INSERT INTO "villages" ("id", "name", "contact_name", "contact_phone", "contact_email")
VALUES
  ('11111111-1111-4111-8111-111111111101', 'Ujunggagak', 'Admin Desa Ujunggagak', '081234567001', 'ujunggagak@desa.id'),
  ('11111111-1111-4111-8111-111111111102', 'Ujungalang', 'Admin Desa Ujungalang', '081234567002', 'ujungalang@desa.id'),
  ('11111111-1111-4111-8111-111111111103', 'Panikel', 'Admin Desa Panikel', '081234567003', 'panikel@desa.id'),
  ('11111111-1111-4111-8111-111111111104', 'Klaces', 'Admin Desa Klaces', '081234567004', 'klaces@desa.id')
ON CONFLICT ("id") DO NOTHING;
