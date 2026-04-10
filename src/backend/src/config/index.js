const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const databaseUrl = process.env.DATABASE_URL || '';
if (!databaseUrl) {
  throw new Error('Missing required env var: DATABASE_URL');
}

const jwtSecretFromEnv = process.env.JWT_SECRET || '';
if (isProduction && jwtSecretFromEnv.length < 32) {
  throw new Error('In production, JWT_SECRET must be set and at least 32 characters long.');
}

if (!isProduction && !jwtSecretFromEnv) {
  console.warn('JWT_SECRET is not set. Falling back to development-only default secret.');
}

const corsOriginRaw = process.env.CORS_ORIGIN || '*';
const corsOrigin = corsOriginRaw === '*'
  ? '*'
  : corsOriginRaw.split(',').map((value) => value.trim()).filter(Boolean);

const config = {
  port: parseInt(process.env.PORT || '4001', 10),
  databaseUrl,
  jwtSecret: jwtSecretFromEnv || 'svp-analytics-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  activationExpiresIn: process.env.ACTIVATION_EXPIRES_IN || '2h',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigin,
  nodeEnv,
  defaultPageLimit: 50,
  maxPageLimit: 1000,
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'SVP Analytics <noreply@svp.org>',
  },
};

module.exports = { config };
