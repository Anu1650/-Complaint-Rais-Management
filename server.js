require('dotenv').config();
const express = require('express');
const session = require('express-session');
const { connect, complaints, admins, verifyPassword } = require('./db');

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

app.get('/', (req, res) => res.redirect('/index.html'));
app.get('/admin', (req, res) => res.redirect('/login.html'));

async function nextId() {
  const year = new Date().getFullYear();
  const last = await complaints().find({ id: { $regex: `^GP-${year}-` } }).sort({ id: -1 }).limit(1).toArray();
  const n = last.length ? parseInt(last[0].id.split('-')[2], 10) + 1 : 1;
  return `GP-${year}-${String(n).padStart(5, '0')}`;
}

// ---------- Public APIs ----------
app.post('/api/complaints', async (req, res) => {
  const { name, phone, category, description, location, media, mediaType } = req.body;
  if (!phone || !category || !location)
    return res.status(400).json({ error: 'Phone, category and location are required' });
  if (!/^[0-9]{10}$/.test(phone))
    return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
  const id = await nextId();
  const createdAt = new Date().toLocaleString();
  const history = [{ status: 'Submitted', at: createdAt }];
  await complaints().insertOne({ id, name: name || '', phone, category, description: description || '', location, media: media || null, mediaType: mediaType || null, status: 'Submitted', assignedTo: '', createdAt, history });
  res.json({ id });
});

app.get('/api/complaints/:id', async (req, res) => {
  const c = await complaints().findOne({ id: { $regex: `^${req.params.id}$`, $options: 'i' } });
  if (!c) return res.status(404).json({ error: 'Not found' });
  delete c._id;
  res.json(c);
});

// ---------- Auth ----------
app.post('/api/auth/login', async (req, res) => {
  const username = (req.body.username || '').trim();
  const password = req.body.password || '';
  const admin = await admins().findOne({ username });
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
app.get('/api/admin/complaints', requireAdmin, async (req, res) => {
  const rows = await complaints().find().sort({ createdAt: -1 }).toArray();
  rows.forEach(r => delete r._id);
  res.json(rows);
});

app.patch('/api/admin/complaints/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body;
  const c = await complaints().findOne({ id: req.params.id });
  if (!c) return res.status(404).json({ error: 'Not found' });
  c.history.push({ status, at: new Date().toLocaleString() });
  await complaints().updateOne({ id: req.params.id }, { $set: { status, history: c.history } });
  res.json({ message: 'Updated' });
});

app.patch('/api/admin/complaints/:id/assign', requireAdmin, async (req, res) => {
  const { assignedTo } = req.body;
  const c = await complaints().findOne({ id: req.params.id });
  if (!c) return res.status(404).json({ error: 'Not found' });
  let status = c.status;
  if (status === 'Submitted' || status === 'Verified') {
    status = 'Assigned';
    c.history.push({ status: 'Assigned', at: new Date().toLocaleString() });
  }
  await complaints().updateOne({ id: req.params.id }, { $set: { assignedTo, status, history: c.history } });
  res.json({ message: 'Assigned' });
});

app.delete('/api/admin/complaints/:id', requireAdmin, async (req, res) => {
  await complaints().deleteOne({ id: req.params.id });
  res.json({ message: 'Deleted' });
});

connect().then(() => {
  app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
}).catch(err => { console.error('❌ MongoDB connection failed:', err.message); process.exit(1); });
