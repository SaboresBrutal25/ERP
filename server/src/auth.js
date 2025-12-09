import jwt from 'jsonwebtoken';
import { jwtSecret } from './config.js';

export const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
  if (!token) return res.status(401).json({ message: 'No autorizado' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export const requireRole = (roles = []) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'No autorizado' });
  if (Array.isArray(roles) && roles.length > 0 && !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Permiso denegado' });
  }
  return next();
};
