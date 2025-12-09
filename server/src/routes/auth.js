import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config.js';

const router = Router();

const users = [
  {
    email: process.env.ADMIN_EMAIL || 'admin@demo.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    role: process.env.MANAGER_ROLE || 'manager',
    location: 'all'
  },
  {
    email: process.env.ENCARGADO_EMAIL || 'encargado@demo.com',
    password: process.env.ENCARGADO_PASSWORD || 'encargado123',
    role: process.env.ENCARGADO_ROLE || 'encargado',
    location: process.env.ENCARGADO_LOCATION || 'Local A'
  }
];

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
  const payload = { email: user.email, role: user.role, location: user.location };
  const token = jwt.sign(payload, jwtSecret, { expiresIn: '12h' });
  return res.json({ token, user: payload });
});

export default router;
