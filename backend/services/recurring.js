import { db } from '../config/db.js';

const DAYS_AHEAD = 7;

function toDepartureAt(dateStr, timeStr) {
  return `${dateStr}T${timeStr}:00.000Z`;
}

export function ensureRecurringRides() {
  const templates = db.prepare('SELECT * FROM recurring_templates').all();
  const today = new Date();
  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);
    const day = d.getDay();
    for (const t of templates) {
      const days = t.days_of_week.split(',').map((x) => parseInt(x.trim(), 10));
      if (!days.includes(day)) continue;
      const departureAt = toDepartureAt(dateStr, t.departure_time);
      const existing = db.prepare(
        'SELECT id FROM rides WHERE recurring_template_id = ? AND date(departure_at) = ?'
      ).get(t.id, dateStr);
      if (existing) continue;
      db.prepare(`
        INSERT INTO rides (driver_id, origin_lat, origin_lng, origin_address, dest_lat, dest_lng, dest_address, departure_at, max_seats, recurring_template_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(t.driver_id, t.origin_lat, t.origin_lng, t.origin_address, t.dest_lat, t.dest_lng, t.dest_address, departureAt, t.max_seats, t.id);
    }
  }
}
