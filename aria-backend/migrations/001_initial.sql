-- ════════════════════════════════════════════════════════════
-- ARIA MUSIC SCHOOL - Initial Database Schema
-- ════════════════════════════════════════════════════════════

-- Drop existing tables (for clean reinstall — comment in production)
-- DROP TABLE IF EXISTS participants, concerts, media, classes, students, teachers, users, settings CASCADE;

-- ─── USERS (admin/teacher login) ───
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'teacher',  -- 'admin' | 'teacher'
  teacher_id    INTEGER,
  last_login    TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── TEACHERS ───
CREATE TABLE IF NOT EXISTS teachers (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  role         VARCHAR(255),                   -- 'Director · Piano' etc.
  bio_es       TEXT,
  bio_en       TEXT,
  photo_url    TEXT,
  email        VARCHAR(255),
  phone        VARCHAR(50),
  specialties  TEXT[],                         -- ['Piano clásico', 'ABRSM', ...]
  languages    TEXT[],                         -- ['es', 'en']
  formats      TEXT[],                         -- ['in_person', 'in_home', 'online']
  credentials  JSONB,                          -- [{degree, school, location}, ...]
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Link users.teacher_id -> teachers.id
ALTER TABLE users
  ADD CONSTRAINT fk_users_teacher
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

-- ─── STUDENTS ───
CREATE TABLE IF NOT EXISTS students (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255),
  phone         VARCHAR(50),
  age           INTEGER,
  is_minor      BOOLEAN NOT NULL DEFAULT FALSE,
  parent_name   VARCHAR(255),
  parent_email  VARCHAR(255),
  parent_phone  VARCHAR(50),
  level         VARCHAR(50),                   -- 'beginner' | 'intermediate' | 'advanced' | 'pre_professional'
  status        VARCHAR(50) NOT NULL DEFAULT 'active',  -- 'active' | 'paused' | 'archived'
  join_date     DATE,
  notes         TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── CLASSES (taught by a teacher to a student) ───
CREATE TABLE IF NOT EXISTS classes (
  id           SERIAL PRIMARY KEY,
  teacher_id   INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id   INTEGER REFERENCES students(id) ON DELETE SET NULL,
  instrument   VARCHAR(100) NOT NULL,          -- 'Piano', 'Flauta', 'Teoría', ...
  duration_min INTEGER NOT NULL,                -- 30, 45, 60, 90
  format       VARCHAR(20) NOT NULL,            -- 'in_person' | 'in_home' | 'online'
  price        DECIMAL(10, 2) NOT NULL,
  level        VARCHAR(50),
  schedule     VARCHAR(255),                    -- 'Tuesdays 4:30 PM' or similar
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── CONCERTS ───
CREATE TABLE IF NOT EXISTS concerts (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  concert_date  DATE NOT NULL,
  concert_time  TIME,
  location      VARCHAR(500),
  description   TEXT,
  status        VARCHAR(20) NOT NULL DEFAULT 'draft',  -- 'draft' | 'published' | 'archived'
  published     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── PARTICIPANTS (students in a concert with their piece) ───
CREATE TABLE IF NOT EXISTS participants (
  id           SERIAL PRIMARY KEY,
  concert_id   INTEGER NOT NULL REFERENCES concerts(id) ON DELETE CASCADE,
  student_id   INTEGER REFERENCES students(id) ON DELETE SET NULL,
  student_name VARCHAR(255) NOT NULL,           -- denormalized so it persists if student is deleted
  instrument   VARCHAR(100),
  piece        VARCHAR(500),                    -- 'Nocturne Op. 9 No. 2'
  composer     VARCHAR(255),                    -- 'Chopin'
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── MEDIA (gallery: photos & videos) ───
CREATE TABLE IF NOT EXISTS media (
  id           SERIAL PRIMARY KEY,
  media_type   VARCHAR(20) NOT NULL,            -- 'photo' | 'video'
  url          TEXT NOT NULL,                   -- public URL of file or embed (YouTube/Vimeo)
  thumbnail_url TEXT,
  title        VARCHAR(255),
  event_name   VARCHAR(255),                    -- 'Winter Recital'
  event_date   DATE,
  concert_id   INTEGER REFERENCES concerts(id) ON DELETE SET NULL,
  published    BOOLEAN NOT NULL DEFAULT TRUE,
  featured     BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── SETTINGS (global key-value config) ───
CREATE TABLE IF NOT EXISTS settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── INDEXES for performance ───
CREATE INDEX IF NOT EXISTS idx_concerts_date     ON concerts(concert_date);
CREATE INDEX IF NOT EXISTS idx_concerts_pub      ON concerts(published, concert_date);
CREATE INDEX IF NOT EXISTS idx_participants_cnt  ON participants(concert_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher   ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_student   ON classes(student_id);
CREATE INDEX IF NOT EXISTS idx_media_published   ON media(published, display_order);
CREATE INDEX IF NOT EXISTS idx_media_type        ON media(media_type);
CREATE INDEX IF NOT EXISTS idx_students_status   ON students(status);

-- ─── TRIGGERS to auto-update updated_at ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['users','teachers','students','classes','concerts','media'])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated ON %I;
      CREATE TRIGGER trg_%I_updated
      BEFORE UPDATE ON %I
      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;
