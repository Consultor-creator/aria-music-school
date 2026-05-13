// /api/classes — CRUD for classes (teacher x instrument x duration x format = price)
const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/classes?teacher_id=&instrument=
router.get('/', optionalAuth, async (req, res) => {
  try {
    const where = ['active = TRUE'];
    const params = [];
    if (req.query.teacher_id) {
      params.push(req.query.teacher_id);
      where.push(`teacher_id = $${params.length}`);
    }
    if (req.query.instrument) {
      params.push(req.query.instrument);
      where.push(`instrument = $${params.length}`);
    }
    const { rows } = await db.query(
      `SELECT c.*, t.name AS teacher_name
       FROM classes c
       JOIN teachers t ON t.id = c.teacher_id
       ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY t.name, c.instrument, c.duration_min, c.format`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET classes:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/classes
router.post('/', requireAuth, async (req, res) => {
  const { teacher_id, student_id, instrument, duration_min, format, price, level, schedule, active } = req.body || {};
  if (!teacher_id || !instrument || !duration_min || !format || price === undefined) {
    return res.status(400).json({ error: 'teacher_id, instrument, duration_min, format, price required' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO classes (teacher_id, student_id, instrument, duration_min, format, price, level, schedule, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [teacher_id, student_id || null, instrument, duration_min, format, price,
       level || null, schedule || null, active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST class:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/classes/:id
router.put('/:id', requireAuth, async (req, res) => {
  const fields = ['teacher_id', 'student_id', 'instrument', 'duration_min', 'format',
                  'price', 'level', 'schedule', 'active'];
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
      `UPDATE classes SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT class:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/classes/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM classes WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE class:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
