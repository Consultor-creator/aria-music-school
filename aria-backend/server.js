// ════════════════════════════════════════════════════════════
// ARIA MUSIC SCHOOL — Backend Server
// ════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security & middleware ───
app.use(helmet({
  contentSecurityPolicy: false,  // disable CSP to allow inline styles in the HTML
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests, please try again later' }
});

// ─── Serve uploaded files ───
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// ─── API routes ───
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/students', require('./routes/students'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/concerts', require('./routes/concerts'));
app.use('/api/media', require('./routes/media'));

// ─── Health check ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Static frontend (serve dashboard.html, website.html from /public) ───
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use(express.static(PUBLIC_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'website.html'));
});
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html'));
});

// ─── 404 ───
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
    res.status(404).send('Not found');
  }
});

// ─── Error handler ───
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

// ─── Start ───
app.listen(PORT, () => {
  console.log(`\n🎵 Aria Music School backend running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Dashboard:    http://localhost:${PORT}/dashboard\n`);
});
