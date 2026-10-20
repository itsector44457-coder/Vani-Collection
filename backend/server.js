require('dotenv').config();

// Active environment reload trigger
if (process.env.DNS_SERVERS) {
  const dns = require('dns');
  const servers = process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

const mongoose = require('mongoose');
const pino = require('pino');
const { loadConfig } = require('./src/config');
const { buildApp } = require('./src/app');
const { startIntegrationWorker } = require('./src/workers/integration-worker');

const logger = pino({ level: process.env.LOG_LEVEL || 'info', redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'] });

async function main() {
  const config = loadConfig();
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 20, autoIndex: config.NODE_ENV !== 'production' });
  logger.info('MongoDB connected');

  const app = buildApp({ config, logger });
  const server = app.listen(config.PORT, '0.0.0.0', () => {
    logger.info({ port: config.PORT }, 'Vani Collection API listening');
    console.log(`🌸 Vani Collection API listening on http://localhost:${config.PORT}`);
  });
  const stopWorker = startIntegrationWorker({ log: logger, pendingPaymentTtlMs: config.PENDING_PAYMENT_TTL_MINUTES * 60_000 });

  const { verifyEmailConnection } = require('./src/services/email');
  if (config.EMAIL_ENABLED) {
    verifyEmailConnection().then((res) => {
      if (res.ok) {
        console.log(`✉️  SMTP Email active: Connected as ${res.user}`);
      } else {
        console.log(`⚠️  SMTP Email notice: ${res.error || res.message}`);
      }
    }).catch((err) => {
      console.log(`⚠️  SMTP Email verify error: ${err.message}`);
    });
  } else {
    console.log('✉️  SMTP Email is disabled (set EMAIL_ENABLED=true in .env to activate)');
  }

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    stopWorker();
    server.close(async () => { await mongoose.connection.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  ['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, () => shutdown(signal)));
}

main().catch((error) => { logger.error({ err: error }, 'startup failed'); process.exit(1); });
