BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE user_type_enum AS ENUM ('ADMIN','PARTNER'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE appointment_status_enum AS ENUM ('PENDING','COMPLETED','CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Trigger to auto-update modified_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Represents an SVP chapter (e.g., "SVP India - Bangalore")
CREATE TABLE IF NOT EXISTS chapters (
  chapter_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_name VARCHAR(100) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  modified_at  TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_chapters_modtime ON chapters;
CREATE TRIGGER update_chapters_modtime BEFORE UPDATE ON chapters FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Represents dashboard users and admins
CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    UUID NOT NULL REFERENCES chapters(chapter_id),
  user_type     user_type_enum NOT NULL DEFAULT 'ADMIN',
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(72) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  modified_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_chapter_email ON users(chapter_id, email);
CREATE INDEX IF NOT EXISTS idx_users_chapter ON users(chapter_id);
DROP TRIGGER IF EXISTS update_users_modtime ON users;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Represents philanthropic partners (donors/members)
CREATE TABLE IF NOT EXISTS partners (
  partner_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id         UUID NOT NULL REFERENCES chapters(chapter_id),
  partner_name       VARCHAR(150) NOT NULL,
  email              VARCHAR(255),
  linkedin_url       VARCHAR(500),
  primary_partner_id UUID REFERENCES partners(partner_id),
  start_date         DATE NOT NULL,
  end_date           DATE,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  modified_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_partner_dates CHECK (start_date <= COALESCE(end_date, '9999-12-31'::date))
);
CREATE INDEX IF NOT EXISTS idx_partners_chapter ON partners(chapter_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_chapter_email ON partners(chapter_id, email) WHERE email IS NOT NULL;
DROP TRIGGER IF EXISTS update_partners_modtime ON partners;
CREATE TRIGGER update_partners_modtime BEFORE UPDATE ON partners FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Represents NGOs/Investees supported by the chapter
CREATE TABLE IF NOT EXISTS investees (
  investee_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    UUID NOT NULL REFERENCES chapters(chapter_id),
  investee_name VARCHAR(200) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  start_date    DATE NOT NULL,
  end_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  modified_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_investee_dates CHECK (start_date <= COALESCE(end_date, '9999-12-31'::date))
);
CREATE INDEX IF NOT EXISTS idx_investees_chapter ON investees(chapter_id);
DROP TRIGGER IF EXISTS update_investees_modtime ON investees;
CREATE TRIGGER update_investees_modtime BEFORE UPDATE ON investees FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Lookup table for types of groups (e.g., "Mentorship Cohort")
CREATE TABLE IF NOT EXISTS group_types (
  group_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    UUID NOT NULL REFERENCES chapters(chapter_id),
  type_name     VARCHAR(150) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  modified_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_chapter_group_type UNIQUE(chapter_id, type_name)
);
CREATE INDEX IF NOT EXISTS idx_group_types_chapter ON group_types(chapter_id);
DROP TRIGGER IF EXISTS update_group_types_modtime ON group_types;
CREATE TRIGGER update_group_types_modtime BEFORE UPDATE ON group_types FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Lookup table for types of appointments (e.g., "Review Meeting")
CREATE TABLE IF NOT EXISTS appointment_types (
  appointment_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id          UUID NOT NULL REFERENCES chapters(chapter_id),
  type_name           VARCHAR(150) NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  modified_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_chapter_appointment_type UNIQUE(chapter_id, type_name)
);
CREATE INDEX IF NOT EXISTS idx_appointment_types_chapter ON appointment_types(chapter_id);
DROP TRIGGER IF EXISTS update_appointment_types_modtime ON appointment_types;
CREATE TRIGGER update_appointment_types_modtime BEFORE UPDATE ON appointment_types FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Represents a structured group of partners working with an investee
CREATE TABLE IF NOT EXISTS groups (
  group_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id    UUID NOT NULL REFERENCES chapters(chapter_id),
  group_name    VARCHAR(150) NOT NULL,
  group_type_id UUID REFERENCES group_types(group_type_id),
  investee_id   UUID REFERENCES investees(investee_id),
  start_date    DATE NOT NULL,
  end_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  modified_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_group_dates CHECK (start_date <= COALESCE(end_date, '9999-12-31'::date))
);
CREATE INDEX IF NOT EXISTS idx_groups_chapter ON groups(chapter_id);
DROP TRIGGER IF EXISTS update_groups_modtime ON groups;
CREATE TRIGGER update_groups_modtime BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Junction table tracking which partners belong to which group
CREATE TABLE IF NOT EXISTS group_partners (
  group_partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id       UUID NOT NULL REFERENCES chapters(chapter_id),
  group_id         UUID NOT NULL REFERENCES groups(group_id) ON DELETE CASCADE,
  partner_id       UUID NOT NULL REFERENCES partners(partner_id),
  start_date       DATE NOT NULL,
  end_date         DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  modified_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_gp_dates CHECK (start_date <= COALESCE(end_date, '9999-12-31'::date))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_gp_unique ON group_partners(group_id, partner_id) WHERE end_date IS NULL;
CREATE INDEX IF NOT EXISTS idx_gp_chapter ON group_partners(chapter_id);
DROP TRIGGER IF EXISTS update_group_partners_modtime ON group_partners;
CREATE TRIGGER update_group_partners_modtime BEFORE UPDATE ON group_partners FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Represents an individual scheduled meeting or activity
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id          UUID NOT NULL REFERENCES chapters(chapter_id),
  appointment_type_id UUID REFERENCES appointment_types(appointment_type_id),
  group_type_id       UUID REFERENCES group_types(group_type_id),
  occurrence_date     DATE NOT NULL,
  start_at            TIMESTAMPTZ NOT NULL,
  end_at              TIMESTAMPTZ NOT NULL,
  duration_minutes    INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_at - start_at))::integer / 60) STORED,
  investee_id         UUID REFERENCES investees(investee_id),
  status              appointment_status_enum NOT NULL DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  modified_at         TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_appointment_times CHECK (start_at <= end_at)
);
CREATE INDEX IF NOT EXISTS idx_appointments_chapter ON appointments(chapter_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(occurrence_date);
DROP TRIGGER IF EXISTS update_appointments_modtime ON appointments;
CREATE TRIGGER update_appointments_modtime BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Junction table tracking partner attendance for appointments
CREATE TABLE IF NOT EXISTS appointment_partners (
  app_partner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id     UUID NOT NULL REFERENCES chapters(chapter_id),
  appointment_id UUID NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
  partner_id     UUID NOT NULL REFERENCES partners(partner_id),
  is_present     BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  modified_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ap_unique ON appointment_partners(appointment_id, partner_id);
CREATE INDEX IF NOT EXISTS idx_ap_chapter ON appointment_partners(chapter_id);
DROP TRIGGER IF EXISTS update_appointment_partners_modtime ON appointment_partners;
CREATE TRIGGER update_appointment_partners_modtime BEFORE UPDATE ON appointment_partners FOR EACH ROW EXECUTE FUNCTION update_modified_column();

COMMIT;
