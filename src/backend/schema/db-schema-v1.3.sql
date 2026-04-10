BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS partner_id UUID;

DO $$ BEGIN
  ALTER TABLE users
    ADD CONSTRAINT users_partner_id_fkey
    FOREIGN KEY (partner_id) REFERENCES partners(partner_id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_partner_id
  ON users(partner_id)
  WHERE partner_id IS NOT NULL;

COMMIT;
