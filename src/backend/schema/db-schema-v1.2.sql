BEGIN;

ALTER TABLE appointment_partners
  ADD COLUMN IF NOT EXISTS absent_informed BOOLEAN;

COMMIT;
