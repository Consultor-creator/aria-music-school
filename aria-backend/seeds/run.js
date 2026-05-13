// Runs all .sql files in /seeds against the database.
// Usage: npm run seed

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

async function run() {
  const dir = path.join(__dirname);
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    for (const file of files) {
      console.log(`▶ Seeding ${file}`);
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      await client.query(sql);
      console.log(`  ✓ done`);
    }

    // After seeds, set Ariadna's password properly with bcrypt
    const defaultPwd = process.env.ADMIN_DEFAULT_PASSWORD || 'ChangeMe123!';
    const hash = await bcrypt.hash(defaultPwd, 10);
    await client.query(
      `UPDATE users SET password_hash = $1 WHERE email = 'ariadnabt07@gmail.com'`,
      [hash]
    );
    console.log(`\n✓ Admin password set to: ${defaultPwd}`);
    console.log('  ⚠ CHANGE THIS PASSWORD IMMEDIATELY in production.\n');

    console.log('Seeding complete.');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
