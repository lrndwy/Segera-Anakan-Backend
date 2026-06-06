ALTER TABLE "villages"
  ADD COLUMN IF NOT EXISTS "bmkg_region_code" varchar(20);

UPDATE "villages" SET "bmkg_region_code" = '33.01.24.2001' WHERE "name" = 'Ujunggagak';
UPDATE "villages" SET "bmkg_region_code" = '33.01.24.2002' WHERE "name" = 'Ujungalang';
UPDATE "villages" SET "bmkg_region_code" = '33.01.24.2003' WHERE "name" = 'Panikel';
UPDATE "villages" SET "bmkg_region_code" = '33.01.24.2004' WHERE "name" = 'Klaces';

CREATE INDEX IF NOT EXISTS "idx_villages_bmkg_region_code" ON "villages" ("bmkg_region_code");
