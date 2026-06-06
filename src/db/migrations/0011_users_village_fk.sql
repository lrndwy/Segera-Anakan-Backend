ALTER TABLE "users"
  ADD CONSTRAINT "users_village_id_villages_id_fk"
  FOREIGN KEY ("village_id") REFERENCES "villages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
