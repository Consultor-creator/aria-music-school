-- ════════════════════════════════════════════════════════════
-- ARIA MUSIC SCHOOL - Seed Data (initial demo content)
-- ════════════════════════════════════════════════════════════

-- ─── ARIADNA (Director / Teacher) ───
INSERT INTO teachers (name, role, bio_es, bio_en, email, phone, specialties, languages, formats, credentials, active)
VALUES (
  'Ariadna Benitez Talavera',
  'Directora · Piano Teacher',
  'Ariadna Benitez Talavera es una pianista y directora de orquesta cubana con una distinguida trayectoria internacional. Ha sido Directora Musical de la Orquesta Sinfónica de Matanzas en Cuba, liderando giras nacionales, estrenos y festivales de gran relevancia. Actualmente cursa el Doctorado en Dirección Orquestal en Boston University.',
  'Ariadna Benitez Talavera is a Cuban pianist and conductor with a distinguished international career. She has served as Music Director of the Matanzas Symphony Orchestra in Cuba, leading national tours, premieres, and major festivals. She is currently pursuing her Doctor of Musical Arts in Orchestral Conducting at Boston University.',
  'ariadnabt07@gmail.com',
  '+1 (931) 338-5397',
  ARRAY['Piano clásico', 'Música de cámara', 'Preparación ABRSM', 'Preparación RCM', 'Audiciones universitarias', 'Dirección de orquesta'],
  ARRAY['es', 'en'],
  ARRAY['in_person', 'in_home', 'online'],
  '[
    {"degree": "DMA", "school": "Boston University", "location": "Massachusetts, USA", "in_progress": true},
    {"degree": "M.M.", "school": "Austin Peay State University", "location": "Tennessee, USA"},
    {"degree": "B.M.", "school": "University of the Arts", "location": "Havana, Cuba"}
  ]'::jsonb,
  TRUE
)
ON CONFLICT DO NOTHING;

-- ─── Admin user (Ariadna can log in) ───
-- NOTE: Replace password_hash with bcrypt hash of a real password before running.
-- This placeholder is the hash of 'ChangeMe123!' (CHANGE IT FIRST).
INSERT INTO users (email, password_hash, name, role, teacher_id)
VALUES (
  'ariadnabt07@gmail.com',
  '$2b$10$rZ.9Y9XQ8x6QqJX3K2u8gOe6yJ8eYxV9xQ2vG7K3yQwYzN5K8eHmW',
  'Ariadna Benitez Talavera',
  'admin',
  (SELECT id FROM teachers WHERE email = 'ariadnabt07@gmail.com' LIMIT 1)
)
ON CONFLICT (email) DO NOTHING;

-- ─── Classes Ariadna teaches ───
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 30, 'in_person', 35, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 45, 'in_person', 55, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 60, 'in_person', 70, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 30, 'in_home', 50, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 45, 'in_home', 70, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 60, 'in_home', 90, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 30, 'online', 35, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 45, 'online', 55, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;
INSERT INTO classes (teacher_id, instrument, duration_min, format, price, level)
SELECT t.id, 'Piano', 60, 'online', 70, NULL FROM teachers t WHERE t.email='ariadnabt07@gmail.com'
ON CONFLICT DO NOTHING;

-- ─── Demo concert (Spring Recital) ───
INSERT INTO concerts (name, concert_date, concert_time, location, description, status, published)
VALUES (
  'Spring Recital',
  '2026-05-30',
  '19:00:00',
  'First Parish of Westwood · 252 Nahatan St',
  'An evening of classical music celebrating the arrival of spring with works by Bach, Chopin, and Latin American composers.',
  'published',
  TRUE
)
ON CONFLICT DO NOTHING;

-- ─── Demo participants for Spring Recital ───
INSERT INTO participants (concert_id, student_name, instrument, piece, composer, display_order)
SELECT c.id, 'Emma Rodríguez', 'Piano', 'Nocturne Op. 9 No. 2', 'Chopin', 1
FROM concerts c WHERE c.name='Spring Recital'
ON CONFLICT DO NOTHING;

INSERT INTO participants (concert_id, student_name, instrument, piece, composer, display_order)
SELECT c.id, 'Sofía Martínez', 'Flauta', 'Flute Concerto K.313', 'Mozart', 2
FROM concerts c WHERE c.name='Spring Recital'
ON CONFLICT DO NOTHING;

INSERT INTO participants (concert_id, student_name, instrument, piece, composer, display_order)
SELECT c.id, 'Liam O''Brien', 'Piano', 'Invention No. 4 in D minor', 'Bach', 3
FROM concerts c WHERE c.name='Spring Recital'
ON CONFLICT DO NOTHING;

-- ─── Settings (school info) ───
INSERT INTO settings (key, value) VALUES
  ('school_name', '"Aria Music School"'::jsonb),
  ('school_address', '"252 Nahatan St, Westwood, Massachusetts 02090"'::jsonb),
  ('school_phone', '"+1 (931) 338-5397"'::jsonb),
  ('school_email', '"ariamusicschool26@gmail.com"'::jsonb),
  ('school_founded', '"2024"'::jsonb),
  ('languages_supported', '["en","es","pt","zh","ht","hi"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
