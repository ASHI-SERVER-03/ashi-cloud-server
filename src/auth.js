import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

export async function ensureBootstrapAdmin() {
  if (!config.adminEmail || !config.adminPassword) return;
  const found = await query('select id from admin_users where email=$1 limit 1', [config.adminEmail]);
  if (found.rowCount) return;
  const hash = await bcrypt.hash(config.adminPassword, 12);
  await query(
    'insert into admin_users(email, password_hash, role) values($1,$2,$3)',
    [config.adminEmail, hash, 'owner']
  );
}

export async function login(email, password) {
  const result = await query('select id,email,password_hash,role from admin_users where email=$1 and disabled_at is null', [email]);
  const user = result.rows[0];
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, config.jwtSecret, { expiresIn: '8h' });
}

export function requireAdmin(req, res, next) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ ok: false, error: 'auth_required' });
  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'auth_invalid' });
  }
}
