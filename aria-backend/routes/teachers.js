// /api/teachers — CRUD for teachers
const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/teachers — list active teachers (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const isAuthed = !!req.user;
    const sql = `
      SELECT t.*,
        COUNT(DISTINCT c.id) AS classes_count,
        COUNT(DISTINCT c.student_id) AS students_count
      FROM teachers t
      LEFT JOIN classes c ON c.teacher_id = t.id AND c.active = TRUE
      ${isAuthed ? '' : 'WHERE t.active = TRUE'}
      GROUP BY t.id
      ORDER BY t.name ASC
    `;
    const { rows } = await db.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('GET teachers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/teachers/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM teachers WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    if (!req.user && !rows[0].active) return res.status(404).json({ error: 'Not found' });

    // Include classes
    const classes = await db.query(
      `SELECT * FROM classes WHERE teacher_id = $1 AND active = TRUE ORDER BY instrument, duration_min, format`,
      [req.params.id]
    );

    res.json({ ...rows[0], classes: classes.rows });
  } catch (err) {
    console.error('GET teacher:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/teachers
router.post('/', requireAuth, async (req, res) => {
  const { name, role, bio_es, bio_en, photo_url, email, phone, specialties, languages, formats, credentials, active } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO teachers (name, role, bio_es, bio_en, photo_url, email, phone, specialties, languages, formats, credentials, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [name, role || null, bio_es || null, bio_en || null, photo_url || null,
       email || null, phone || null, specialties || [], languages || [],
       formats || [], credentials || null, active !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST teacher:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/teachers/:id
router.put('/:id', requireAuth, async (req, res) => {
  const fields = ['name', 'role', 'bio_es', 'bio_en', 'photo_url', 'email', 'phone',
                  'specialties', 'languages', 'formats', 'credentials', 'active'];
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
      `UPDATE teachers SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT teacher:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/teachers/:id
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM teachers WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE teacher:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
