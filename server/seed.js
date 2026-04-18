/**
 * Crea el admin inicial.
 * Uso: node server/seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./db/pool');

async function seed() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO admins (username, password_hash)
     VALUES ($1, $2)
     ON CONFLICT (username) DO UPDATE SET password_hash = $2`,
    [username, hash]
  );
  console.log(`Admin '${username}' creado/actualizado.`);
  await pool.end();
}

seed().catch((e) => { console.error(e); process.exit(1); });
