# Development Environment Setup

## Prerequisites
- Node.js 20+
- MongoDB (local or Atlas)

## Backend Setup
```bash
cd server
cp .env.example .env
# Update MONGO_URL and JWT_SECRET
npm install
npm run dev
```

## Frontend Setup
```bash
cd frontend
cp .env.example .env
# Update EXPO_PUBLIC_BACKEND_URL
npm install
npm start
```

## Environment Variables

### server/.env
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=shieldnet
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
EXPO_ACCESS_TOKEN=
```

### frontend/.env
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:4000/api
```

## Testing
```bash
cd frontend
npm test
```

## File Structure
```
incident-reporting-app/
├── frontend/              # React Native app
├── server/                # Express API
└── tests/
```
