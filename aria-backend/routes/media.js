// /api/media — gallery: photos and videos
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─── File upload setup ───
// In production with Railway, mount a volume at /data for persistence.
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|mp4|mov|webm)$/i;
    if (allowed.test(file.originalname)) cb(null, true);
    else cb(new Error('File type not allowed'));
  }
});

// ─── GET /api/media ───
router.get('/', optionalAuth, async (req, res) => {
  try {
    const where = [];
    const params = [];
    if (!req.user) where.push(`published = TRUE`);
    if (req.query.type) {
      params.push(req.query.type);
      where.push(`media_type = $${params.length}`);
    }
    if (req.query.concert_id) {
      params.push(req.query.concert_id);
      where.push(`concert_id = $${params.length}`);
    }
    const { rows } = await db.query(
      `SELECT * FROM media ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
       ORDER BY display_order ASC, created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('GET media:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/media/upload ───  (file upload)
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const ext = path.extname(req.file.filename).toLowerCase();
  const isVideo = ['.mp4', '.mov', '.webm'].includes(ext);
  const publicUrl = `/uploads/${req.file.filename}`;

  const { title, event_name, event_date, concert_id, published, featured } = req.body || {};

  try {
    const { rows } = await db.query(
      `INSERT INTO media (media_type, url, title, event_name, event_date, concert_id, published, featured)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [isVideo ? 'video' : 'photo', publicUrl, title || null, event_name || null,
       event_date || null, concert_id || null, published !== 'false', featured === 'true']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST upload:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── POST /api/media ───  (link to external URL — e.g. YouTube/Vimeo)
router.post('/', requireAuth, async (req, res) => {
  const { media_type, url, thumbnail_url, title, event_name, event_date, concert_id, published, featured, display_order } = req.body || {};
  if (!media_type || !url) return res.status(400).json({ error: 'media_type and url required' });

  try {
    const { rows } = await db.query(
      `INSERT INTO media (media_type, url, thumbnail_url, title, event_name, event_date, concert_id, published, featured, display_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [media_type, url, thumbnail_url || null, title || null, event_name || null,
       event_date || null, concert_id || null, published !== false, !!featured, display_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST media:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── PUT /api/media/:id ───
router.put('/:id', requireAuth, async (req, res) => {
  const fields = ['title', 'event_name', 'event_date', 'concert_id', 'published',
                  'featured', 'display_order', 'thumbnail_url'];
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
      `UPDATE media SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT media:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── DELETE /api/media/:id ───
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT url FROM media WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });

    // delete file from disk if it was uploaded (not an external URL)
    if (rows[0].url?.startsWith('/uploads/')) {
      const filepath = path.join(UPLOAD_DIR, path.basename(rows[0].url));
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }

    await db.query(`DELETE FROM media WHERE id = $1`, [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('DELETE media:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
