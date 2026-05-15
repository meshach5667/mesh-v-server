const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { connectDatabase } = require('./config/db');
const errorHandler = require('./middleware/error');
const { initWebsocket } = require('./services/websocket');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const incidentRoutes = require('./routes/incidents');
const hotspotRoutes = require('./routes/hotspots');

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.corsOrigin, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/api', (req, res) => {
  res.json({ status: 'running', service: 'ShieldNet API' });
});

app.get('/', (req, res) => {
  res.json({ status: 'running', service: 'ShieldNet API' });
});


app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/hotspots', hotspotRoutes);

app.use(errorHandler);

const server = http.createServer(app);
initWebsocket(server);

const start = async () => {
  await connectDatabase();
  
  if (!process.env.VERCEL) {
    server.listen(env.port, () => {
      console.log(`ShieldNet API listening on port ${env.port}`);
    });
  }
};

start().catch((error) => {
  console.error('Failed to start server:', error);
  if (!process.env.VERCEL) {
    process.exit(1);
  }
});

module.exports = app;
