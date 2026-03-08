import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'carpool.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('driver', 'passenger')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      origin_lat REAL NOT NULL,
      origin_lng REAL NOT NULL,
      origin_address TEXT,
      dest_lat REAL NOT NULL,
      dest_lng REAL NOT NULL,
      dest_address TEXT,
      departure_at TEXT NOT NULL,
      max_seats INTEGER NOT NULL,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed', 'cancelled')),
      last_lat REAL,
      last_lng REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ride_passengers (
      ride_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY (ride_id, user_id),
      FOREIGN KEY (ride_id) REFERENCES rides(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS recurring_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id INTEGER NOT NULL,
      origin_lat REAL NOT NULL,
      origin_lng REAL NOT NULL,
      origin_address TEXT,
      dest_lat REAL NOT NULL,
      dest_lng REAL NOT NULL,
      dest_address TEXT,
      departure_time TEXT NOT NULL,
      days_of_week TEXT NOT NULL,
      max_seats INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (driver_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ride_ratings (
      ride_id INTEGER NOT NULL,
      rater_id INTEGER NOT NULL,
      rated_id INTEGER NOT NULL,
      score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (ride_id, rater_id, rated_id),
      FOREIGN KEY (ride_id) REFERENCES rides(id),
      FOREIGN KEY (rater_id) REFERENCES users(id),
      FOREIGN KEY (rated_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
    CREATE INDEX IF NOT EXISTS idx_rides_departure ON rides(departure_at);
    CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
    CREATE INDEX IF NOT EXISTS idx_ride_passengers_ride ON ride_passengers(ride_id);
    CREATE INDEX IF NOT EXISTS idx_ride_ratings_rated ON ride_ratings(rated_id);
  `);
  try {
    const cols = db.prepare('PRAGMA table_info(rides)').all().map((c) => c.name);
    if (!cols.includes('recurring_template_id')) {
      db.exec('ALTER TABLE rides ADD COLUMN recurring_template_id INTEGER REFERENCES recurring_templates(id)');
      db.exec('CREATE INDEX IF NOT EXISTS idx_rides_recurring_template ON rides(recurring_template_id)');
    }
  } catch (_) {}
}
