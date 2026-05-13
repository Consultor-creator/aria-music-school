// /api/enrollments — CRUD para inscripciones (estudiante en una clase)
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth); // Todas las rutas requieren autenticación

// ═══════════════════════════════════════════════════════════
// GET /api/enrollments
// Lista todas las inscripciones con info de estudiante, clase y maestro
// Filtros: ?student_id= ?class_id= ?status= ?teacher_id=
// ═══════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const where = [];
    const params = [];

    if (req.query.student_id) {
      params.push(req.query.student_id);
      where.push(`e.student_id = $${params.length}`);
    }
    if (req.query.class_id) {
      params.push(req.query.class_id);
      where.push(`e.class_id = $${params.length}`);
    }
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`e.status = $${params.length}`);
    }
    if (req.query.teacher_id) {
      params.push(req.query.teacher_id);
      where.push(`c.teacher_id = $${params.length}`);
    }

    const sql = `
      SELECT
        e.*,
        s.name AS student_name,
        s.email AS student_email,
        s.parent_name,
        s.is_minor,
        c.instrument,
        c.duration_min,
        c.format,
        c.price,
        c.level AS class_level,
        c.schedule,
        c.teacher_id,
        t.name AS teacher_name
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN classes c  ON c.id = e.class_id
      JOIN teachers t ON t.id = c.teacher_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY e.start_date DESC, s.name ASC
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET enrollments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/enrollments/:id — Una inscripción específica
// ═══════════════════════════════════════════════════════════
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         e.*,
         s.name AS student_name, s.email AS student_email,
         s.parent_name, s.parent_email, s.parent_phone, s.is_minor,
         c.instrument, c.duration_min, c.format, c.price, c.schedule,
         c.teacher_id,
         t.name AS teacher_name
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN classes c  ON c.id = e.class_id
       JOIN teachers t ON t.id = c.teacher_id
       WHERE e.id = $1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET enrollment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// POST /api/enrollments — Crear nueva inscripción
// Body: { student_id, class_id, start_date, end_date?, status?, notes? }
// ═══════════════════════════════════════════════════════════
router.post('/', async (req, res) => {
  const { student_id, class_id, start_date, end_date, status, notes } = req.body || {};

  if (!student_id || !class_id || !start_date) {
    return res.status(400).json({
      error: 'student_id, class_id y start_date son requeridos'
    });
  }

  // Verificar que estudiante y clase existan
  try {
    const checks = await db.query(
      `SELECT
         (SELECT 1 FROM students WHERE id=$1) AS student_exists,
         (SELECT 1 FROM classes WHERE id=$2) AS class_exists`,
      [student_id, class_id]
    );
    if (!checks.rows[0].student_exists) return res.status(404).json({ error: 'Student not found' });
    if (!checks.rows[0].class_exists)   return res.status(404).json({ error: 'Class not found' });

    // Verificar duplicado activo
    const existing = await db.query(
      `SELECT id FROM enrollments
       WHERE student_id=$1 AND class_id=$2 AND status='active'`,
      [student_id, class_id]
    );
    if (existing.rows[0]) {
      return res.status(409).json({
        error: 'Este estudiante ya tiene una inscripción activa en esta clase',
        enrollment_id: existing.rows[0].id
      });
    }

    const { rows } = await db.query(
      `INSERT INTO enrollments (student_id, class_id, start_date, end_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student_id, class_id, start_date, end_date || null, status || 'active', notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST enrollment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// PUT /api/enrollments/:id — Editar inscripción
// ═══════════════════════════════════════════════════════════
router.put('/:id', async (req, res) => {
  const fields = ['student_id', 'class_id', 'start_date', 'end_date', 'status', 'notes'];
  const updates = [];
  const params = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      params.push(req.body[f]);
      updates.push(`${f} = $${params.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  try {
    const { rows } = await db.query(
      `UPDATE enrollments SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT enrollment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// PATCH /api/enrollments/:id/pause — Pausar
// ═══════════════════════════════════════════════════════════
router.patch('/:id/pause', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE enrollments SET status='paused' WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH pause:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// PATCH /api/enrollments/:id/resume — Reactivar
// ═══════════════════════════════════════════════════════════
router.patch('/:id/resume', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE enrollments SET status='active' WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH resume:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// PATCH /api/enrollments/:id/cancel — Cancelar
// ═══════════════════════════════════════════════════════════
router.patch('/:id/cancel', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE enrollments SET status='cancelled', end_date=COALESCE(end_date, CURRENT_DATE) WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH cancel:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// DELETE /api/enrollments/:id — Eliminar permanentemente
// ═══════════════════════════════════════════════════════════
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM enrollments WHERE id=$1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE enrollment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/enrollments/student/:studentId — Todas las inscripciones de un estudiante
// ═══════════════════════════════════════════════════════════
router.get('/student/:studentId', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         e.*,
         c.instrument, c.duration_min, c.format, c.price, c.schedule,
         t.name AS teacher_name
       FROM enrollments e
       JOIN classes c  ON c.id = e.class_id
       JOIN teachers t ON t.id = c.teacher_id
       WHERE e.student_id = $1
       ORDER BY e.status='active' DESC, e.start_date DESC`,
      [req.params.studentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET enrollments/student:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// GET /api/enrollments/class/:classId — Todos los estudiantes en una clase
// ═══════════════════════════════════════════════════════════
router.get('/class/:classId', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         e.*,
         s.name AS student_name, s.email, s.phone, s.age,
         s.is_minor, s.parent_name, s.parent_phone, s.level
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.class_id = $1
       ORDER BY e.status='active' DESC, s.name ASC`,
      [req.params.classId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET enrollments/class:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
