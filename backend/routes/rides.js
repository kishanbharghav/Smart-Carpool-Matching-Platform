import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { db } from '../config/db.js';
import { geocodeAddress, hasCoords } from '../services/geocode.js';
import { getRoute } from '../services/route.js';
import { computeFuelCost, costPerPassenger, haversineKm, co2SavedKg } from '../services/fuelCost.js';
import { ensureRecurringRides } from '../services/recurring.js';

const router = Router();

router.use(authMiddleware);

function getDriverRatingAvg(driverId) {
  const row = db.prepare('SELECT AVG(score) as avg FROM ride_ratings WHERE rated_id = ?').get(driverId);
  return row?.avg != null ? Math.round(row.avg * 10) / 10 : null;
}

function rideRowToRide(row, passengersCount = 0) {
  if (!row) return null;
  const seatsLeft = row.max_seats - (passengersCount ?? 0);
  const distKm = haversineKm(row.origin_lat, row.origin_lng, row.dest_lat, row.dest_lng);
  const { total: estimated_cost } = computeFuelCost(distKm);
  const ride = {
    id: row.id,
    driver_id: row.driver_id,
    driver_name: row.driver_name,
    origin_lat: row.origin_lat,
    origin_lng: row.origin_lng,
    origin_address: row.origin_address,
    dest_lat: row.dest_lat,
    dest_lng: row.dest_lng,
    dest_address: row.dest_address,
    departure_at: row.departure_at,
    max_seats: row.max_seats,
    seats_taken: passengersCount ?? 0,
    seats_left: seatsLeft,
    status: row.status,
    last_lat: row.last_lat,
    last_lng: row.last_lng,
    created_at: row.created_at,
    recurring_template_id: row.recurring_template_id ?? null,
    estimated_distance_km: Math.round(distKm * 100) / 100,
    estimated_cost: Math.round(estimated_cost * 100) / 100,
  };
  if (row.driver_id) ride.driver_rating_avg = getDriverRatingAvg(row.driver_id);
  return ride;
}

router.post('/', async (req, res) => {
  const { origin, destination, departure_at, max_seats } = req.body || {};
  let origin_lat, origin_lng, origin_address;
  let dest_lat, dest_lng, dest_address;

  if (hasCoords(origin)) {
    origin_lat = origin.lat;
    origin_lng = origin.lng;
    origin_address = origin.address || null;
  } else if (typeof origin === 'string' && origin.trim()) {
    const geo = await geocodeAddress(origin);
    if (!geo) return res.status(400).json({ error: 'Could not find origin address. Try "Use my current location" or a different address.' });
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
    if (!geo) return res.status(400).json({ error: 'Could not find destination address. Try a different address or landmark.' });
    dest_lat = geo.lat;
    dest_lng = geo.lng;
    dest_address = geo.display_name || destination;
  } else {
    return res.status(400).json({ error: 'Destination (address or lat/lng) is required' });
  }

  if (!departure_at || !max_seats || max_seats < 1) {
    return res.status(400).json({ error: 'departure_at and max_seats (>= 1) are required' });
  }
  const seats = parseInt(max_seats, 10);
  if (isNaN(seats) || seats < 1 || seats > 6) {
    return res.status(400).json({ error: 'max_seats must be between 1 and 6' });
  }
  const dep = new Date(departure_at);
  if (isNaN(dep.getTime()) || dep.getTime() < Date.now()) {
    return res.status(400).json({ error: 'departure_at must be a valid future date and time' });
  }

  const result = db.prepare(`
    INSERT INTO rides (driver_id, origin_lat, origin_lng, origin_address, dest_lat, dest_lng, dest_address, departure_at, max_seats)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, origin_lat, origin_lng, origin_address, dest_lat, dest_lng, dest_address, departure_at, seats);

  const ride = db.prepare(`
    SELECT r.*, u.name as driver_name FROM rides r
    JOIN users u ON u.id = r.driver_id
    WHERE r.id = ?
  `).get(result.lastInsertRowid);
  const count = db.prepare('SELECT COUNT(*) as c FROM ride_passengers WHERE ride_id = ?').get(ride.id);
  return res.status(201).json(rideRowToRide(ride, count?.c ?? 0));
});

router.get('/', (req, res) => {
  ensureRecurringRides();
  const { date, status = 'scheduled', my } = req.query;
  let sql = `
    SELECT r.*, u.name as driver_name FROM rides r
    JOIN users u ON u.id = r.driver_id
    WHERE r.status = ?
  `;
  const params = [status];
  if (date) {
    sql += ` AND date(r.departure_at) = date(?)`;
    params.push(date);
  }
  if (my === 'true' || my === '1') {
    sql += ` AND (r.driver_id = ? OR r.id IN (SELECT ride_id FROM ride_passengers WHERE user_id = ?))`;
    params.push(req.user.id, req.user.id);
  }
  sql += ` ORDER BY r.departure_at ASC`;
  const rows = db.prepare(sql).all(...params);
  const passengerRideIds = new Set(
    db.prepare('SELECT ride_id FROM ride_passengers WHERE user_id = ?').all(req.user.id).map((r) => r.ride_id)
  );
  const out = rows.map((row) => {
    const count = db.prepare('SELECT COUNT(*) as c FROM ride_passengers WHERE ride_id = ?').get(row.id);
    const ride = rideRowToRide(row, count?.c ?? 0);
    ride.is_passenger = passengerRideIds.has(row.id);
    return ride;
  });
  return res.json(out);
});

router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ride id' });
  const row = db.prepare(`
    SELECT r.*, u.name as driver_name FROM rides r
    JOIN users u ON u.id = r.driver_id
    WHERE r.id = ?
  `).get(id);
  if (!row) return res.status(404).json({ error: 'Ride not found' });
  const count = db.prepare('SELECT COUNT(*) as c FROM ride_passengers WHERE ride_id = ?').get(id);
  const isPassenger = db.prepare('SELECT 1 FROM ride_passengers WHERE ride_id = ? AND user_id = ?').get(id, req.user.id);
  const passengers = db.prepare(`
    SELECT rp.user_id as id, u.name FROM ride_passengers rp
    JOIN users u ON u.id = rp.user_id
    WHERE rp.ride_id = ?
  `).all(id);
  const ride = rideRowToRide(row, count?.c ?? 0);
  ride.is_passenger = !!isPassenger;
  ride.passengers = passengers.map((p) => ({ id: p.id, name: p.name }));
  return res.json(ride);
});

router.post('/:id/join', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ride id' });
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.driver_id === req.user.id) return res.status(400).json({ error: 'Driver cannot join as passenger' });
  if (ride.status !== 'scheduled') return res.status(400).json({ error: 'Ride is not open for joining' });
  const count = db.prepare('SELECT COUNT(*) as c FROM ride_passengers WHERE ride_id = ?').get(id);
  if ((count?.c ?? 0) >= ride.max_seats) return res.status(400).json({ error: 'No seats left' });
  try {
    db.prepare('INSERT INTO ride_passengers (ride_id, user_id) VALUES (?, ?)').run(id, req.user.id);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') return res.status(400).json({ error: 'Already joined' });
    throw e;
  }
  const row = db.prepare(`
    SELECT r.*, u.name as driver_name FROM rides r JOIN users u ON u.id = r.driver_id WHERE r.id = ?
  `).get(id);
  const newCount = db.prepare('SELECT COUNT(*) as c FROM ride_passengers WHERE ride_id = ?').get(id);
  return res.json(rideRowToRide(row, newCount?.c ?? 0));
});

router.post('/:id/leave', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ride id' });
  const result = db.prepare('DELETE FROM ride_passengers WHERE ride_id = ? AND user_id = ?').run(id, req.user.id);
  if (result.changes === 0) return res.status(400).json({ error: 'You are not in this ride' });
  return res.json({ left: true });
});

router.get('/:id/route', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ride id' });
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  const coords = [
    { lat: ride.origin_lat, lng: ride.origin_lng },
    { lat: ride.dest_lat, lng: ride.dest_lng },
  ];
  const route = await getRoute(coords);
  if (!route) return res.status(502).json({ error: 'Routing service unavailable' });
  const { total: fuelTotal } = computeFuelCost(route.distance_km);
  const passengerCount = db.prepare('SELECT COUNT(*) as c FROM ride_passengers WHERE ride_id = ?').get(id)?.c ?? 0;
  const costPerSeat = costPerPassenger(fuelTotal, passengerCount);
  const co2_saved_kg = co2SavedKg(route.distance_km, passengerCount);
  return res.json({
    distance_km: route.distance_km,
    duration_seconds: route.duration_seconds,
    geometry: route.geometry,
    fuel_cost_total: fuelTotal,
    cost_per_passenger: costPerSeat,
    co2_saved_kg: co2_saved_kg,
  });
});

router.get('/:id/cost', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const mileage = parseFloat(req.query.mileage) || 15;
  const fuelPrice = parseFloat(req.query.fuel_price) || 100;
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ride id' });
  const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  try {
    const route = await getRoute([{ lat: ride.origin_lat, lng: ride.origin_lng }, { lat: ride.dest_lat, lng: ride.dest_lng }]);
    if (!route) return res.status(502).json({ error: 'Routing service unavailable' });
    const { total } = computeFuelCost(route.distance_km, mileage, fuelPrice);
    const passengerCount = db.prepare('SELECT COUNT(*) as c FROM ride_passengers WHERE ride_id = ?').get(id)?.c ?? 0;
    return res.json({
      distance_km: route.distance_km,
      fuel_cost_total: total,
      cost_per_passenger: costPerPassenger(total, passengerCount),
    });
  } catch {
    return res.status(502).json({ error: 'Routing service unavailable' });
  }
});

router.patch('/:id/location', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { lat, lng } = req.body || {};
  if (isNaN(id) || typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'Invalid ride id or lat/lng' });
  }
  const ride = db.prepare('SELECT driver_id FROM rides WHERE id = ?').get(id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Only driver can update location' });
  db.prepare('UPDATE rides SET last_lat = ?, last_lng = ? WHERE id = ?').run(lat, lng, id);
  return res.json({ updated: true });
});

router.patch('/:id/status', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body || {};
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ride id' });
  if (status !== 'active' && status !== 'completed') {
    return res.status(400).json({ error: 'status must be active or completed' });
  }
  const ride = db.prepare('SELECT id, driver_id, status FROM rides WHERE id = ?').get(id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.driver_id !== req.user.id) return res.status(403).json({ error: 'Only driver can update status' });
  if (status === 'active' && ride.status !== 'scheduled') {
    return res.status(400).json({ error: 'Ride can only be started when scheduled' });
  }
  if (status === 'completed' && ride.status !== 'active') {
    return res.status(400).json({ error: 'Only an active ride can be ended' });
  }
  db.prepare('UPDATE rides SET status = ? WHERE id = ?').run(status, id);
  const row = db.prepare('SELECT r.*, u.name as driver_name FROM rides r JOIN users u ON u.id = r.driver_id WHERE r.id = ?').get(id);
  const count = db.prepare('SELECT COUNT(*) as c FROM ride_passengers WHERE ride_id = ?').get(id);
  return res.json(rideRowToRide(row, count?.c ?? 0));
});

router.post('/:id/rate', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rated_id, score, comment } = req.body || {};
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ride id' });
  const ride = db.prepare('SELECT driver_id, status FROM rides WHERE id = ?').get(id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.status !== 'completed') return res.status(400).json({ error: 'Can only rate after ride is completed' });
  const rid = parseInt(rated_id, 10);
  if (isNaN(rid) || rid === req.user.id) return res.status(400).json({ error: 'Valid rated_id (other than yourself) is required' });
  const s = parseInt(score, 10);
  if (isNaN(s) || s < 1 || s > 5) return res.status(400).json({ error: 'score must be between 1 and 5' });
  const isDriver = ride.driver_id === req.user.id;
  const isPassenger = db.prepare('SELECT 1 FROM ride_passengers WHERE ride_id = ? AND user_id = ?').get(id, req.user.id);
  if (!isDriver && !isPassenger) return res.status(403).json({ error: 'Only driver or passengers can rate' });
  const isRatedDriver = rid === ride.driver_id;
  const isRatedPassenger = db.prepare('SELECT 1 FROM ride_passengers WHERE ride_id = ? AND user_id = ?').get(id, rid);
  if (!isRatedDriver && !isRatedPassenger) return res.status(400).json({ error: 'rated_id must be driver or a passenger of this ride' });
  try {
    db.prepare('DELETE FROM ride_ratings WHERE ride_id = ? AND rater_id = ? AND rated_id = ?').run(id, req.user.id, rid);
    db.prepare('INSERT INTO ride_ratings (ride_id, rater_id, rated_id, score, comment) VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, rid, s, comment || null);
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT') return res.status(400).json({ error: 'Invalid ride or user' });
    throw e;
  }
  return res.json({ rated: true });
});

router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ride id' });

  const ride = db.prepare('SELECT id, driver_id FROM rides WHERE id = ?').get(id);
  if (!ride) return res.status(404).json({ error: 'Ride not found' });
  if (ride.driver_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the driver who created the ride can cancel it' });
  }

  // Remove all passengers for this ride, then remove the ride itself
  db.prepare('DELETE FROM ride_passengers WHERE ride_id = ?').run(id);
  db.prepare('DELETE FROM rides WHERE id = ?').run(id);

  return res.json({ deleted: true });
});

export default router;
