-- ════════════════════════════════════════════════════════════
-- ARIA MUSIC SCHOOL - Migration 002: Enrollments
-- Vincula estudiantes con clases (inscripciones)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS enrollments (
  id            SERIAL PRIMARY KEY,
  student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id      INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE,
  status        VARCHAR(20) NOT NULL DEFAULT 'active',
                -- 'active'    = inscripción vigente, clases activas
                -- 'paused'    = pausada temporalmente (vacaciones, etc.)
                -- 'cancelled' = cancelada
                -- 'completed' = terminó (alcanzó end_date)
  notes         TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Prevenir duplicados: un estudiante no puede inscribirse 2 veces en la misma clase activa
  CONSTRAINT enrollments_unique_active UNIQUE (student_id, class_id, status)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class   ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status  ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_dates   ON enrollments(start_date, end_date);

-- Trigger para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trg_enrollments_updated ON enrollments;
CREATE TRIGGER trg_enrollments_updated
BEFORE UPDATE ON enrollments
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
