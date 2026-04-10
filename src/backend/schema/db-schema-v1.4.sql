BEGIN;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_name VARCHAR(200);

ALTER TABLE recurring_appointments
  ADD COLUMN IF NOT EXISTS appointment_name VARCHAR(200);

COMMIT;
