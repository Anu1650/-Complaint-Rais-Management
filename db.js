const { MongoClient } = require('mongodb');
const crypto = require('crypto');

let db;

async function connect() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    // No Atlas URI in .env — fall back to a local in-memory MongoDB so the app still runs
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    console.log('⚠️  MONGODB_URI not set in .env — using local in-memory MongoDB (data lost on restart).');
  } else {
    console.log('🔗 Using MONGODB_URI from .env');
  }
  const client = new MongoClient(uri);
  await client.connect();
  db = client.db('panchayat');
  console.log('✅ Connected to MongoDB');

  // Ensure default admin exists
  const count = await db.collection('admins').countDocuments();
  if (count === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    await db.collection('admins').insertOne({ username, passwordHash: hashPassword(password) });
    console.log(`👤 Default admin created — username: ${username} / password: ${password}`);
  }
  return db;
}

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

module.exports = {
  connect,
  complaints: () => db.collection('complaints'),
  admins: () => db.collection('admins'),
  verifyPassword,
};
