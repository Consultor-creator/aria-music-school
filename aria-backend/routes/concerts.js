// /api/concerts — CRUD for concerts + participants management
const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── GET /api/concerts ───
// Public: published upcoming concerts (optionally filter by past/upcoming)
// Authed: all concerts including drafts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const isAuthed = !!req.user;
    const { upcoming, past } = req.query;
    const today = new Date().toISOString().slice(0, 10);

    let where = [];
    const params = [];

    if (!isAuthed) where.push(`published = TRUE`);
    if (upcoming === 'true') {
      params.push(today);
      where.push(`concert_date >= $${params.length}`);
    }
    if (past === 'true') {
      params.push(today);
      where.push(`concert_date < $${params.length}`);
    }

    const sql = `
      SELECT c.*,
        COALESCE(json_agg(
          json_build_object(
            'id', p.id,
            'student_name', p.student_name,
            'instrument', p.instrument,
            'piece', p.piece,
            'composer', p.composer,
            'display_order', p.display_order
          ) ORDER BY p.display_order
        ) FILTER (WHERE p.id IS NOT NULL), '[]') AS participants
      FROM concerts c
      LEFT JOIN participants p ON p.concert_id = c.id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      GROUP BY c.id
      ORDER BY c.concert_date ASC
    `;
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('GET concerts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── GET /api/concerts/:id ───
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*,
        COALESCE(json_agg(
          json_build_object(
            'id', p.id,
            'student_name', p.student_name,
            'instrument', p.instrument,
            'piece', p.piece,
            'composer', p.composer,
            'display_order', p.display_order
          ) ORDER BY p.display_order
        ) FILTER (WHERE p.id IS NOT NULL), '[]') AS participants
       FROM concerts c
       LEFT JOIN participants p ON p.concert_id = c.id
       WHERE c.id = $1
       GROUP BY c.id`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    if (!req.user && !rows[0].published) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('GET concert:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/concerts ───  (auth only)
router.post('/', requireAuth, async (req, res) => {
  const { name, concert_date, concert_time, location, description, status, published } = req.body || {};
  if (!name || !concert_date) return res.status(400).json({ error: 'name and concert_date required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO concerts (name, concert_date, concert_time, location, description, status, published)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, concert_date, concert_time || null, location || null, description || null,
       status || 'draft', published === true]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST concert:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/concerts/:id ───
router.put('/:id', requireAuth, async (req, res) => {
  const fields = ['name', 'concert_date', 'concert_time', 'location', 'description', 'status', 'published'];
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
      `UPDATE concerts SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT concert:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/concerts/:id ───
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM concerts WHERE id = $1`, [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE concert:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════════════════════════════════════════════════════
// PARTICIPANTS
// ═══════════════════════════════════════════════════════════

// POST /api/concerts/:id/participants
router.post('/:id/participants', requireAuth, async (req, res) => {
  const { student_id, student_name, instrument, piece, composer, display_order } = req.body || {};
  if (!student_name) return res.status(400).json({ error: 'student_name required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO participants (concert_id, student_id, student_name, instrument, piece, composer, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, student_id || null, student_name, instrument || null,
       piece || null, composer || null, display_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST participant:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/concerts/:concertId/participants/:participantId
router.put('/:concertId/participants/:participantId', requireAuth, async (req, res) => {
  const fields = ['student_id', 'student_name', 'instrument', 'piece', 'composer', 'display_order'];
  const updates = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) {
      params.push(req.body[f]);
      updates.push(`${f} = $${params.length}`);
    }
  }
  if (!updates.length) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.participantId, req.params.concertId);
  try {
    const { rows } = await db.query(
      `UPDATE participants SET ${updates.join(', ')}
       WHERE id = $${params.length - 1} AND concert_id = $${params.length}
       RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT participant:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/concerts/:concertId/participants/:participantId
router.delete('/:concertId/participants/:participantId', requireAuth, async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM participants WHERE id = $1 AND concert_id = $2`,
      [req.params.participantId, req.params.concertId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE participant:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
