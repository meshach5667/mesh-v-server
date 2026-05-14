# API Reference

Base URL: `EXPO_PUBLIC_BACKEND_URL` (default `http://localhost:4000/api`).

## Authentication

### Register
`POST /api/auth/register`
```json
{
  "email": "user@example.com",
  "password": "secret123",
  "displayName": "Jane Doe"
}
```
Response:
```json
{
  "token": "...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "Jane Doe"
  }
}
```

### Login
`POST /api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

### Current User
`GET /api/auth/me`
Header: `Authorization: Bearer <token>`

## User Location

### Update Location
`POST /api/user/location`
Header: `Authorization: Bearer <token>`
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "expoPushToken": "ExponentPushToken[xxxx]"
}
```

## Incidents

### Create Incident
`POST /api/incidents`
Header: `Authorization: Bearer <token>`
```json
{
  "incident_type": "theft",
  "description": "Incident details",
  "latitude": 40.7128,
  "longitude": -74.0060,
  "severity": "high"
}
```

### Create Emergency Incident
`POST /api/incidents/emergency`
Header: `Authorization: Bearer <token>`
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "description": "Emergency SOS triggered"
}
```

### List Incidents
`GET /api/incidents`
Query params: `latitude`, `longitude`, `radiusKm`, `status`, `limit`

### Nearby Incidents
`GET /api/incidents/nearby`
Query params: `latitude`, `longitude`, `radiusKm`

## Hotspots
`GET /api/hotspots`
Query params: `minIncidents`, `limit`

## Real-time
`WebSocket /api/ws`
Server broadcasts `new_incident` events with incident payloads.
