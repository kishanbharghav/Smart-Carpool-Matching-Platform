import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../config/db.js';
import { geocodeAddress, hasCoords } from '../services/geocode.js';

const router = Router();

router.use(authMiddleware);

router.post('/', async (req, res) => {
  const { origin, destination, departure_time, days_of_week, max_seats } = req.body || {};
  let origin_lat, origin_lng, origin_address;
  let dest_lat, dest_lng, dest_address;

  if (hasCoords(origin)) {
    origin_lat = origin.lat;
    origin_lng = origin.lng;
    origin_address = origin.address || null;
  } else if (typeof origin === 'string' && origin.trim()) {
    const geo = await geocodeAddress(origin);
    if (!geo) return res.status(400).json({ error: 'Could not find origin address' });
    origin_lat = geo.lat;
    origin_lng = geo.lng;
    origin_address = geo.display_name || origin;
  } else {
    return res.status(400).json({ error: 'Origin (address or lat/lng) is required' });
  }

  if (hasCoords(destination)) {
    dest_lat = destination.lat;
    dest_lng = destination.lng;
    dest_address = destination.address || null;
  } else if (typeof destination === 'string' && destination.trim()) {
    const geo = await geocodeAddress(destination);
    if (!geo) return res.status(400).json({ error: 'Could not find destination address' });
    dest_lat = geo.lat;
    dest_lng = geo.lng;
    dest_address = geo.display_name || destination;
  } else {
    return res.status(400).json({ error: 'Destination (address or lat/lng) is required' });
  }

  if (!departure_time || typeof departure_time !== 'string' || !/^\d{1,2}:\d{2}$/.test(departure_time.trim())) {
    return res.status(400).json({ error: 'departure_time is required (e.g. "08:00")' });
  }
  const timeStr = departure_time.trim();
  const days = Array.isArray(days_of_week)
    ? days_of_week.map((d) => parseInt(d, 10)).filter((d) => d >= 0 && d <= 6)
    : (typeof days_of_week === 'string' ? days_of_week.split(',').map((d) => parseInt(d.trim(), 10)) : []).filter((d) => !isNaN(d) && d >= 0 && d <= 6);
  if (days.length === 0) return res.status(400).json({ error: 'days_of_week must include at least one day (0=Sun, 1=Mon, ..., 6=Sat)' });
  const seats = Math.min(6, Math.max(1, parseInt(max_seats, 10) || 2));

  const result = db.prepare(`
    INSERT INTO recurring_templates (driver_id, origin_lat, origin_lng, origin_address, dest_lat, dest_lng, dest_address, departure_time, days_of_week, max_seats)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, origin_lat, origin_lng, origin_address, dest_lat, dest_lng, dest_address, timeStr, days.join(','), seats);

  const row = db.prepare('SELECT * FROM recurring_templates WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(row);
});

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM recurring_templates WHERE driver_id = ? ORDER BY id DESC').all(req.user.id);
  return res.json(rows);
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  const t = db.prepare('SELECT id, driver_id FROM recurring_templates WHERE id = ?').get(id);
  if (!t) return res.status(404).json({ error: 'Recurring template not found' });
  if (t.driver_id !== req.user.id) return res.status(403).json({ error: 'Only the owner can delete this template' });
  db.prepare('DELETE FROM recurring_templates WHERE id = ?').run(id);
  return res.json({ deleted: true });
});

export default router;
