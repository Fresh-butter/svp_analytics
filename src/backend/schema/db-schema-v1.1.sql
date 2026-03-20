
BEGIN;

-- Defines a recurring schedule template for appointments
CREATE TABLE IF NOT EXISTS recurring_appointments (
  rec_appointment_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id          UUID NOT NULL REFERENCES chapters(chapter_id),
  group_id            UUID REFERENCES groups(group_id),
  appointment_type_id UUID REFERENCES appointment_types(appointment_type_id),
  start_time          TIME NOT NULL,
  duration_minutes    INTEGER NOT NULL,
  rrule               TEXT NOT NULL,
  investee_id         UUID REFERENCES investees(investee_id),
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  modified_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_rec_dates CHECK (start_date <= end_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_appointments_chapter
  ON recurring_appointments(chapter_id);

CREATE INDEX IF NOT EXISTS idx_recurring_appointments_dates
  ON recurring_appointments(start_date, end_date);

DROP TRIGGER IF EXISTS update_recurring_appointments_modtime ON recurring_appointments;
CREATE TRIGGER update_recurring_appointments_modtime BEFORE UPDATE ON recurring_appointments FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Tracks the specific partners expected to attend the recurring appointments
CREATE TABLE IF NOT EXISTS recurring_appointment_partners (
  rec_app_partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id         UUID NOT NULL REFERENCES chapters(chapter_id),
  rec_appointment_id UUID NOT NULL
    REFERENCES recurring_appointments(rec_appointment_id) ON DELETE CASCADE,
  partner_id         UUID NOT NULL REFERENCES partners(partner_id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  modified_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rap_unique
  ON recurring_appointment_partners(rec_appointment_id, partner_id);

CREATE INDEX IF NOT EXISTS idx_rap_chapter ON recurring_appointment_partners(chapter_id);

DROP TRIGGER IF EXISTS update_recurring_appointment_partners_modtime ON recurring_appointment_partners;
CREATE TRIGGER update_recurring_appointment_partners_modtime BEFORE UPDATE ON recurring_appointment_partners FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Add reference to the recurring template on individual appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS rec_appointment_id UUID
    REFERENCES recurring_appointments(rec_appointment_id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_rec_occurrence
  ON appointments(rec_appointment_id, occurrence_date)
  WHERE rec_appointment_id IS NOT NULL;

COMMIT;
