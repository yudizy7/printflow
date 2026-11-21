import jwt from 'jsonwebtoken';
import { HttpError } from '../errors.js';

export function signToken(user, secret) {
  return jwt.sign({ name: user.name, role: user.role }, secret, {
    subject: String(user.id),
    expiresIn: '7d',
  });
}

export function requireAuth(secret) {
  return (req, res, next) => {
    const [type, token] = (req.headers.authorization || '').split(' ');
    if (type !== 'Bearer' || !token) return next(new HttpError(401, 'Token não informado'));
    try {
      const payload = jwt.verify(token, secret);
      req.user = { id: Number(payload.sub), name: payload.name, role: payload.role };
      return next();
    } catch {
      return next(new HttpError(401, 'Token inválido ou expirado'));
    }
  };
}
