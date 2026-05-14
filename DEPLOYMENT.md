# Deployment Instructions

## Prerequisites
- Node.js 20+
- MongoDB (Atlas or self-hosted)
- Expo access token (optional for push notifications)

## Step 1: Backend Deployment

1. Install dependencies:
   ```bash
   cd server
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Update the following values in `server/.env`:
   - `MONGO_URL`
   - `JWT_SECRET`
   - `CORS_ORIGIN`
   - `EXPO_ACCESS_TOKEN` (optional)

3. Start the server:
   ```bash
   npm start
   ```

Server defaults to port `4000`.

## Step 2: Frontend Configuration

Update `frontend/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://your-api.example.com/api
```

## Step 3: Validate Deployment

1. Register a user and log in.
2. Report an incident.
3. Confirm incidents appear on the map.
4. Verify push notifications (Expo token configured).

## Notes
- Ensure MongoDB Atlas has network access for your server.
- Use a process manager (PM2, systemd, or Docker) in production.
- Configure HTTPS at the reverse proxy level (Nginx, Caddy, etc.).
