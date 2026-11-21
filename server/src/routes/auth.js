import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { HttpError } from '../errors.js';
import { loginSchema, registerSchema } from '../validation.js';
import { requireAuth, signToken } from '../middleware/auth.js';

export function authRouter({ db, jwtSecret }) {
  const router = Router();
  const findPublicUser = (id) =>
    db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id);

  router.post('/register', async (req, res) => {
    const data = registerSchema.parse(req.body);
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(data.email)) {
      throw new HttpError(409, 'E-mail já cadastrado');
    }
    const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
    const hash = await bcrypt.hash(data.password, 10);
    const { lastInsertRowid } = db
      .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run(data.name, data.email, hash, n === 0 ? 'admin' : 'operador');
    const user = findPublicUser(lastInsertRowid);
    res.status(201).json({ token: signToken(user, jwtSecret), user });
  });

  router.post('/login', async (req, res) => {
    const data = loginSchema.parse(req.body);
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
    if (!row || !(await bcrypt.compare(data.password, row.password_hash))) {
      throw new HttpError(401, 'E-mail ou senha inválidos');
    }
    const user = findPublicUser(row.id);
    res.json({ token: signToken(user, jwtSecret), user });
  });

  router.get('/me', requireAuth(jwtSecret), (req, res) => {
    const user = findPublicUser(req.user.id);
    if (!user) throw new HttpError(401, 'Usuário não encontrado');
    res.json({ user });
  });

  return router;
}
