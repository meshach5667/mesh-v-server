# ShieldNet - Community Safety Platform

Community safety app for incident reporting, proximity alerts, and hotspot analytics.

## Features
- Incident reporting with GPS location and severity levels.
- Live map with recent incidents and quick map handoff.
- Proximity alerts via Expo push notifications.
- Hotspot analytics with geospatial aggregation.
- Email/password authentication with JWT sessions.

## Tech Stack
### Frontend
- React Native (Expo)
- Expo Router
- Expo Location
- Expo Notifications

### Backend
- Express
- MongoDB (Mongoose)
- JWT authentication
- WebSocket real-time updates
- Expo Server SDK for notifications

## Getting Started
### Backend
```bash
cd server
cp .env.example .env
# Set MONGO_URL and JWT_SECRET before starting
npm install
npm run dev
```

Server runs at `http://localhost:4000`.

### Frontend
```bash
cd frontend
cp .env.example .env
# Set EXPO_PUBLIC_BACKEND_URL to your server
yarn install
yarn start
```

## Environment Variables
### server/.env
- `MONGO_URL`
- `DB_NAME` (optional)
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (default `7d`)
- `CORS_ORIGIN`
- `EXPO_ACCESS_TOKEN` (optional for push notifications)

### frontend/.env
- `EXPO_PUBLIC_BACKEND_URL`

## API Endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/user/location`
- `POST /api/incidents`
- `POST /api/incidents/emergency`
- `GET /api/incidents`
- `GET /api/incidents/nearby`
- `GET /api/hotspots`
- `WebSocket /api/ws`

## Notes
- MongoDB geospatial indexes are defined in the Mongoose models.
- Proximity alerts require Expo push tokens from the mobile app.