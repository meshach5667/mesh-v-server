const dotenv = require('dotenv');

dotenv.config();

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUrl: required('MONGO_URL'),
  dbName: process.env.DB_NAME || undefined,
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN || '',
};

module.exports = env;
