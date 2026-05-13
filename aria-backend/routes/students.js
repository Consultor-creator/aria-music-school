// /api/students — CRUD for students (private only)
const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth); // ALL routes require auth — student data is private

// GET /api/students
router.get('/', async (req, res) => {
  try {
    const where = [];
    const params = [];
    if (req.query.status) {
      params.push(req.query.status);
      where.push(`status = $${params.length}`);
    }
    const { rows } = await db.query(
      `SELECT * FROM students ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY name ASC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET students:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM students WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET student:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/students
router.post('/', async (req, res) => {
  const { name, email, phone, age, is_minor, parent_name, parent_email, parent_phone, level, status, join_date, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO students (name, email, phone, age, is_minor, parent_name, parent_email, parent_phone, level, status, join_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [name, email || null, phone || null, age || null,
       !!is_minor, parent_name || null, parent_email || null, parent_phone || null,
       level || null, status || 'active', join_date || null, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST student:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/students/:id
router.put('/:id', async (req, res) => {
  const fields = ['name', 'email', 'phone', 'age', 'is_minor', 'parent_name', 'parent_email',
                  'parent_phone', 'level', 'status', 'join_date', 'notes'];
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
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT student:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM students WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE student:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
