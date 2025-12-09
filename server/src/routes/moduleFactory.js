import { Router } from 'express';
import { nanoid } from 'nanoid';
import { loadRows, saveRows } from '../dataStore.js';
import { requireAuth } from '../auth.js';

export const createModuleRouter = (config, name) => {
  const router = Router();

  const filterByRole = (rows, user) => {
    if (user?.role === 'encargado' && config.locationField && user.location && user.location !== 'all') {
      return rows.filter((row) => (row[config.locationField] || '').toLowerCase() === user.location.toLowerCase());
    }
    return rows;
  };

  router.get('/', requireAuth, (req, res) => {
    try {
      const rows = loadRows(name);
      return res.json(filterByRole(rows, req.user));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.post('/', requireAuth, (req, res) => {
    try {
      const payload = { ...req.body };
      payload.id = payload.id || nanoid(8);
      if (req.user?.role === 'encargado' && config.locationField) {
        payload[config.locationField] = req.user.location;
      }
      const rows = loadRows(name);
      rows.push(payload);
      saveRows(name, rows);
      return res.status(201).json(payload);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.put('/:id', requireAuth, (req, res) => {
    try {
      const rows = loadRows(name);
      const idx = rows.findIndex((row) => row.id === req.params.id);
      if (idx === -1) return res.status(404).json({ message: 'No encontrado' });
      const existing = rows[idx];
      if (req.user?.role === 'encargado' && config.locationField && existing[config.locationField] !== req.user.location) {
        return res.status(403).json({ message: 'Permiso denegado para este local' });
      }
      const updated = { ...existing, ...req.body, id: req.params.id };
      rows[idx] = updated;
      saveRows(name, rows);
      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  router.delete('/:id', requireAuth, (req, res) => {
    try {
      const rows = loadRows(name);
      const existing = rows.find((row) => row.id === req.params.id);
      if (!existing) return res.status(404).json({ message: 'No encontrado' });
      if (req.user?.role === 'encargado' && config.locationField && existing[config.locationField] !== req.user.location) {
        return res.status(403).json({ message: 'Permiso denegado para este local' });
      }
      const filtered = rows.filter((row) => row.id !== req.params.id);
      saveRows(name, filtered);
      return res.json({ id: req.params.id });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });

  return router;
};
