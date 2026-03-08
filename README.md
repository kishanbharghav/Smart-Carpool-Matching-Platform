# SRM Carpool

Carpool web app for SRM University students: post rides, join rides, live map tracking, route and fuel cost.

## Quick start

From the project root, run backend and frontend in two terminals:

```bash
# Terminal 1 – backend
cd backend && npm install && npm start

# Terminal 2 – frontend
cd frontend && npm install && npm run dev
```

Backend: http://localhost:5000 · Frontend: http://localhost:3000 (proxies API and Socket.io).

## Setup

### Backend

```bash
cd backend
cp .env.example .env   # optional: set env vars (see below)
npm install
npm start
```

Runs on http://localhost:5000 (API + Socket.io).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:3000 with proxy to backend. Installable as a PWA (Add to home screen).

### Environment variables (backend)

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for signing auth tokens (set in production) | `dev-secret` |
| `PORT` | Server port | `5000` |
| `DATABASE_PATH` | Path to SQLite database file | `data/carpool.db` |
| `OSRM_BASE_URL` | OSRM routing service base URL | `https://router.project-osrm.org` |
| `NOMINATIM_BASE_URL` | Nominatim geocoding base URL | `https://nominatim.openstreetmap.org` |

## Features

- **Auth**: Register/Login with SRM email (@srmist.edu.in or @srmuniv.edu.in).
- **Post a ride**: Origin (address, campus quick picks, or "Use my location"), destination, time, seats.
- **Find rides**: List with date filter (Today / Upcoming), "My rides only", estimated cost; join or leave.
- **Ride detail**: Route, distance, fuel cost per passenger, CO₂ saved, passenger list, status (Start/End ride).
- **Live map**: Route polyline (OSRM); driver location shared in real time (Socket.io).

## APIs

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/rides` (query: `date`, `my`, `status`), `POST /api/rides`, `GET /api/rides/:id`, `POST /api/rides/:id/join`, `POST /api/rides/:id/leave`
- `GET /api/rides/:id/route`, `GET /api/rides/:id/cost`, `PATCH /api/rides/:id/location`, `PATCH /api/rides/:id/status`

Maps: OpenStreetMap tiles, Nominatim (geocoding), OSRM (routing).
"# Smart-Carpool-Matching-Platform" 
