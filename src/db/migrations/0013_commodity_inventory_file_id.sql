ALTER TABLE "commodity_inventory"
  ADD COLUMN IF NOT EXISTS "file_id" uuid REFERENCES "files" ("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_commodity_inventory_file_id" ON "commodity_inventory" ("file_id");
