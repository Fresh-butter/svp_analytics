const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { config } = require('./index');

const pool = new Pool({ connectionString: config.databaseUrl });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: config.nodeEnv === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = { prisma };
