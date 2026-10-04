require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { db, verifyPassword } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
}));
app.use(express.static('public'));

// First page = citizen page
app.get('/', (req, res) => res.redirect('/index.html'));
// /admin → login (then dashboard after OTP)
app.get('/admin', (req, res) => res.redirect('/login.html'));



function nextId() {
  const year = new Date().getFullYear();
  const row = db.prepare(`SELECT id FROM complaints WHERE id LIKE ? ORDER BY id DESC LIMIT 1`).get(`GP-${year}-%`);
  const n = row ? parseInt(row.id.split('-')[2], 10) + 1 : 1;
  return `GP-${year}-${String(n).padStart(5, '0')}`;
}

// ---------- Public APIs ----------
app.post('/api/complaints', (req, res) => {
  const { name, phone, category, description, location, media, mediaType } = req.body;
  if (!phone || !category || !location)
    return res.status(400).json({ error: 'Phone, category and location are required' });
  if (!/^[0-9]{10}$/.test(phone))
    return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
  if (category === 'Other' && !description)
    return res.status(400).json({ error: 'Please specify the complaint type' });
  const id = nextId();
  const createdAt = new Date().toLocaleString();
  const history = [{ status: 'Submitted', at: createdAt }];
  db.prepare(`INSERT INTO complaints (id,name,phone,category,description,location,media,mediaType,status,assignedTo,createdAt,history)
              VALUES (?,?,?,?,?,?,?,?,'Submitted','',?,?)`)
    .run(id, name || '', phone, category, description || '', location, media || null, mediaType || null, createdAt, JSON.stringify(history));
  res.json({ id });
});

app.get('/api/complaints/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM complaints WHERE id = ? COLLATE NOCASE').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  c.history = JSON.parse(c.history);
  res.json(c);
});

// ---------- Auth (username + password) ----------
app.post('/api/auth/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !verifyPassword(password, admin.passwordHash))
    return res.status(401).json({ error: 'Invalid username or password' });
  req.session.admin = admin.username;
  res.json({ message: 'Logged in', admin: admin.username });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out' }));
});

function requireAdmin(req, res, next) {
  if (!req.session.admin) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

app.get('/api/auth/me', (req, res) => {
  res.json({ admin: req.session.admin || null });
});

// ---------- Admin APIs ----------
app.get('/api/admin/complaints', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM complaints ORDER BY createdAt DESC').all();
  rows.forEach(r => r.history = JSON.parse(r.history));
  res.json(rows);
});

app.patch('/api/admin/complaints/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const c = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const history = JSON.parse(c.history);
  history.push({ status, at: new Date().toLocaleString() });
  db.prepare('UPDATE complaints SET status = ?, history = ? WHERE id = ?').run(status, JSON.stringify(history), req.params.id);
  res.json({ message: 'Updated' });
});

app.patch('/api/admin/complaints/:id/assign', requireAdmin, (req, res) => {
  const { assignedTo } = req.body;
  const c = db.prepare('SELECT * FROM complaints WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const history = JSON.parse(c.history);
  let status = c.status;
  if (status === 'Submitted' || status === 'Verified') {
    status = 'Assigned';
    history.push({ status: 'Assigned', at: new Date().toLocaleString() });
  }
  db.prepare('UPDATE complaints SET assignedTo = ?, status = ?, history = ? WHERE id = ?').run(assignedTo, status, JSON.stringify(history), req.params.id);
  res.json({ message: 'Assigned' });
});

app.delete('/api/admin/complaints/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM complaints WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
