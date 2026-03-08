import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const ALLOWED_DOMAINS = ['srmist.edu.in', 'srmuniv.edu.in'];

function isAllowedEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain && ALLOWED_DOMAINS.includes(domain);
}

router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (!isAllowedEmail(email)) {
    return res.status(400).json({ error: 'Only SRM college email (@srmist.edu.in or @srmuniv.edu.in) is allowed' });
  }
  const r = role?.toLowerCase();
  if (r !== 'driver' && r !== 'passenger') {
    return res.status(400).json({ error: 'Role must be driver or passenger' });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), email.trim().toLowerCase(), password_hash, r || 'passenger');
    const user = { id: result.lastInsertRowid, name: name.trim(), email: email.trim().toLowerCase(), role: r || 'passenger' };
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ user, token });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    throw e;
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  const row = db.prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ user, token });
});

router.get('/me', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.user.id);
  if (!row) return res.status(404).json({ error: 'User not found' });
  return res.json({ id: row.id, name: row.name, email: row.email, role: row.role });
});

export default router;
