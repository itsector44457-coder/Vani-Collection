const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { AppError } = require('./lib/errors');
const { authMiddleware, optionalAuthMiddleware } = require('./middleware/auth');
const { configureEmail } = require('./services/email');
const { configureLoyalty } = require('./services/loyalty');

const buildApp = ({ config, logger }) => {
  // Give the email service the parsed config before any route can trigger a send.
  configureEmail(config);
  // Same for loyalty: rates, tiers and expiry come from config, not from module-level constants.
  configureLoyalty(config);
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { req.rawBody = buf; } }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  const genReqId = (req, res) => { const id = req.headers['x-request-id'] || crypto.randomUUID(); res.setHeader('x-request-id', id); return id; };
  // Accept any logger exposing pino's levels; otherwise fall back to a request-scoped noop logger.
  app.use(logger?.levels ? pinoHttp({ logger, genReqId }) : (req, _res, next) => {
    req.id = genReqId(req, _res);
    // A caller-provided fallback logger (notably the test logger) should still receive request-scoped
    // errors; replacing it with a hard-coded no-op hid the cause of real 500s in integration tests.
    req.log = logger?.child ? logger.child({ requestId: req.id }) : { info() {}, warn() {}, error() {}, debug() {} };
    next();
  });

  // The integration suite drives many hundreds of requests through one process and signs in once per
  // scenario, so the production ceilings (600 and 20 per 15 minutes) throttle it into 429s that look
  // exactly like application bugs. Nothing asserts rate limiting, so lift the ceilings under
  // NODE_ENV=test and leave the middleware mounted — production behaviour is byte-identical.
  const isTestEnv = config.NODE_ENV === 'test';
  const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: isTestEnv ? 1_000_000 : 600, standardHeaders: 'draft-8', legacyHeaders: false });
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: isTestEnv ? 1_000_000 : 20, standardHeaders: 'draft-8', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } } });
  app.use('/api', apiLimiter);

  const auth = authMiddleware(config);
  const optionalAuth = optionalAuthMiddleware(config);
  app.get('/health', (_req, res) => res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', uptime: process.uptime(), version: '2.0.0' }));
  app.get('/health/ready', (_req, res) => (mongoose.connection.readyState === 1 ? res.json({ ready: true }) : res.status(503).json({ ready: false })));

  // Mounting through a registry keeps the route surface discoverable (scripts/list-routes.js, tests).
  const registry = [];
  app.locals.routes = registry;
  const mount = (base, router, middleware) => {
    app.use(base, ...(middleware ? [middleware] : []), router);
    registry.push({ base, router });
  };

  mount('/api/auth', require('./routes/auth')({ config, auth }), authLimiter);
  mount('/api/cart', require('./routes/cart')({ auth, optionalAuth }));
  mount('/api/products', require('./routes/products')({ auth }));
  mount('/api/orders', require('./routes/orders')({ config, auth }));
  mount('/api/inventory', require('./routes/inventory')({ auth }));
  mount('/api/customers', require('./routes/customers')({ auth }));
  mount('/api/loyalty', require('./routes/loyalty')({ auth }));
  mount('/api/reviews', require('./routes/reviews')({ auth }));
  mount('/api/coupons', require('./routes/coupons')({ auth }));
  mount('/api/returns', require('./routes/returns')({ auth }));
  mount('/api/admin', require('./routes/admin')({ auth, config }));
  mount('/api/admin/reels', require('./routes/reels')({ auth }));
  mount('/api/content', require('./routes/content')({ auth }));
  mount('/api/integrations', require('./routes/integrations')({ config, auth }));
  mount('/api/shipments', require('./routes/shipments')({ config, auth }));
  mount('/api/uploads', require('./routes/uploads')({ auth }));
  mount('/api/webhooks', require('./routes/webhooks')({ config }));
  mount('/api', require('./routes/misc')({ config, auth }));

  app.use((_req, _res, next) => next(new AppError(404, 'ROUTE_NOT_FOUND', 'Endpoint not found')));
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, _next) => {
    const status = error.status || (error.name === 'ValidationError' ? 422 : 500);
    if (status >= 500) req.log?.error({ err: error }, 'request failed');
    const body = { error: { code: error.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED'), message: status === 500 ? 'Something went wrong' : error.message, requestId: req.id } };
    if (error.details) body.error.details = error.details;
    res.status(status).json(body);
  });
  return app;
};
module.exports = { buildApp };
