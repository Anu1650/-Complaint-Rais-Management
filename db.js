const Database = require('better-sqlite3');
const db = new Database('panchayat.db');

db.exec(`
CREATE TABLE IF NOT EXISTS complaints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  media TEXT,
  mediaType TEXT,
  status TEXT DEFAULT 'Submitted',
  assignedTo TEXT DEFAULT '',
  createdAt TEXT NOT NULL,
  history TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS admins (
  username TEXT PRIMARY KEY,
  passwordHash TEXT NOT NULL
);
`);

const crypto = require('crypto');

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const test = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'));
}

// Create default admin if none exists
const count = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (count === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  db.prepare('INSERT INTO admins (username, passwordHash) VALUES (?,?)').run(username, hashPassword(password));
  console.log(`👤 Default admin created — username: ${username} / password: ${password}`);
}

module.exports = { db, hashPassword, verifyPassword };
