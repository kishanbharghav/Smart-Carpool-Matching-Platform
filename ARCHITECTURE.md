# SRM Carpool – Architecture

## High-level system

```mermaid
flowchart TB
  subgraph client [Frontend]
    Browser[Browser]
    React[React + Vite]
    AuthCtx[AuthContext]
    ToastCtx[ToastContext]
    Api[axios API]
    SocketC[Socket.io client]
    Leaflet[Leaflet Map]
    React --> AuthCtx
    React --> ToastCtx
    React --> Api
    React --> SocketC
    React --> Leaflet
    Browser --> React
  end

  subgraph server [Backend]
    Express[Express]
    AuthMw[Auth middleware]
    AuthRoutes[auth routes]
    RideRoutes[rides routes]
    RecurRoutes[recurring routes]
    SocketS[Socket.io server]
    Express --> AuthMw
    AuthMw --> AuthRoutes
    AuthMw --> RideRoutes
    AuthMw --> RecurRoutes
    Express --> SocketS
  end

  subgraph data [Data]
    SQLite[(SQLite)]
    Express --> SQLite
    SocketS --> SQLite
  end

  subgraph external [External]
    Nominatim[Nominatim geocoding]
    OSRM[OSRM routing]
    Express --> Nominatim
    Express --> OSRM
  end

  Api -->|HTTP /api/*| Express
  SocketC -->|WebSocket| SocketS
```

## Request and auth flow

```mermaid
sequenceDiagram
  participant User
  participant React
  participant Api
  participant Express
  participant DB

  User->>React: Login
  React->>Api: POST /api/auth/login
  Api->>Express: Request + body
  Express->>DB: Verify user
  DB-->>Express: User row
  Express-->>Api: 200 + token
  Api-->>React: Store token, set header
  React->>User: Redirect to dashboard

  Note over Api: All later requests
  React->>Api: GET /api/rides (Bearer token)
  Api->>Express: Authorization header
  Express->>Express: JWT verify
  Express->>DB: Rides + recurring fill
  DB-->>Express: Rows
  Express-->>Api: JSON
  Api-->>React: Rides list
```

## Real-time location (map)

```mermaid
sequenceDiagram
  participant Driver as Driver browser
  participant SocketC as Socket client
  participant SocketS as Socket server
  participant DB
  participant Passenger as Passenger browser

  Driver->>SocketC: join_ride, driver_location
  SocketC->>SocketS: Emit driver_location
  SocketS->>DB: Verify driver for ride
  SocketS->>SocketS: socket.to(ride:id)
  SocketS->>Passenger: driver_location event
  Passenger->>Passenger: Update map marker
```

## Data model (simplified)

```mermaid
erDiagram
  users ||--o{ rides : "drives"
  users ||--o{ ride_passengers : "joins"
  users ||--o{ recurring_templates : "owns"
  users ||--o{ ride_ratings : "rates / rated_by"

  rides ||--o{ ride_passengers : "has"
  rides ||--o{ ride_ratings : "has"
  recurring_templates ||--o{ rides : "generates"

  users {
    int id PK
    string name
    string email
    string password_hash
    string role
  }

  rides {
    int id PK
    int driver_id FK
    float origin_lat
    float origin_lng
    string origin_address
    float dest_lat
    float dest_lng
    string dest_address
    datetime departure_at
    int max_seats
    string status
    int recurring_template_id FK
  }

  ride_passengers {
    int ride_id PK,FK
    int user_id PK,FK
  }

  recurring_templates {
    int id PK
    int driver_id FK
    string departure_time
    string days_of_week
    int max_seats
  }

  ride_ratings {
    int ride_id PK,FK
    int rater_id PK,FK
    int rated_id PK,FK
    int score
    string comment
  }
```

## Frontend structure

```mermaid
flowchart LR
  subgraph routes [Routes]
    Login[Login]
    Register[Register]
    Dashboard[Dashboard]
    PostRide[PostRide]
    RideDetail[RideDetail]
    RideMap[RideMap]
  end

  subgraph context [Context]
    Auth[AuthProvider]
    Toast[ToastProvider]
  end

  subgraph shared [Shared]
    api[api.js]
    useSocket[useSocket]
  end

  Auth --> routes
  Toast --> routes
  routes --> api
  RideMap --> useSocket
  RideDetail --> api
  Dashboard --> api
  PostRide --> api
```

## Backend structure

```mermaid
flowchart TB
  server[server.js]
  server --> initDb[initDb]
  server --> authRoutes[auth routes]
  server --> rideRoutes[rides routes]
  server --> recurringRoutes[recurring routes]
  server --> initSocket[initSocket]

  rideRoutes --> geocode[geocode service]
  rideRoutes --> route[route service]
  rideRoutes --> fuelCost[fuelCost service]
  rideRoutes --> recurring[recurring service]

  geocode --> Nominatim[Nominatim API]
  route --> OSRM[OSRM API]

  authRoutes --> db[(db)]
  rideRoutes --> db
  recurringRoutes --> db
  recurring --> db
  initSocket --> db
```

## Key files

| Layer   | Path | Purpose |
|---------|------|---------|
| Entry   | `backend/server.js` | Express app, HTTP server, Socket.io, route mounting |
| Entry   | `frontend/src/main.jsx` | React root, CSS |
| App     | `frontend/src/App.jsx` | Router, Auth + Toast providers, route definitions |
| Auth    | `frontend/src/context/AuthContext.jsx` | Token, user, login/logout, 401 listener |
| API     | `frontend/src/api.js` | Axios instance, 401 interceptor |
| Socket  | `frontend/src/hooks/useSocket.js` | Socket.io client hook |
| Socket  | `backend/socket.js` | join_ride, driver_location broadcast |
| DB      | `backend/config/db.js` | SQLite, schema, migrations |
| Rides   | `backend/routes/rides.js` | CRUD, join/leave, route, status, rate, location |
| Recurring | `backend/routes/recurring.js` | Recurring template CRUD |
| Recurring | `backend/services/recurring.js` | ensureRecurringRides for next 7 days |
| Geocode | `backend/services/geocode.js` | Nominatim lookup, cache |
| Route   | `backend/services/route.js` | OSRM route, cache |
| Fuel    | `backend/services/fuelCost.js` | Cost, CO₂ saved |
