require('dotenv').config();
const mongoose = require('mongoose');
const pino = require('pino');
const { loadConfig } = require('./src/config');
const { buildApp } = require('./src/app');
const { startIntegrationWorker } = require('./src/workers/integration-worker');

const logger = pino({ level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'), redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'] });

async function main() {
  const config = loadConfig();
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 10_000, maxPoolSize: 20, autoIndex: config.NODE_ENV !== 'production' });
  logger.info('MongoDB connected');

  const app = buildApp({ config, logger });
  const server = app.listen(config.PORT, '0.0.0.0', () => logger.info({ port: config.PORT }, 'Vani Collection API listening'));
  const stopWorker = startIntegrationWorker({ log: logger });

  const shutdown = async (signal) => {
    logger.info({ signal }, 'shutting down');
    stopWorker();
    server.close(async () => { await mongoose.connection.close(); process.exit(0); });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  ['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, () => shutdown(signal)));
}

main().catch((error) => { logger.error({ err: error }, 'startup failed'); process.exit(1); });
