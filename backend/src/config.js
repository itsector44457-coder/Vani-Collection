const { z } = require('zod');

const bool = z.string().optional().transform((v) => v === 'true');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: z.string().min(1),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_SECURE: bool,
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  COOKIE_DOMAIN: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  SHIPROCKET_EMAIL: z.string().optional(),
  SHIPROCKET_PASSWORD: z.string().optional(),
  SHIPROCKET_PICKUP_LOCATION: z.string().default('Primary'),
  ERP_ENABLED: bool,
  ERP_BASE_URL: z.string().optional(),
  ERP_AUTH_HEADER: z.string().default('Authorization'),
  ERP_AUTH_TOKEN: z.string().optional(),
  ERP_PRODUCTS_PATH: z.string().default('/api/products'),
  ERP_STOCK_PATH: z.string().default('/api/stock'),
  ERP_ORDERS_PATH: z.string().default('/api/orders'),
  ERP_TIMEOUT_MS: z.coerce.number().positive().default(15000),
  ERP_WEBHOOK_SECRET: z.string().optional(),
});

function loadConfig() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  return {
    ...parsed.data,
    corsOrigins: parsed.data.CORS_ORIGINS.split(',').map((v) => v.trim()).filter(Boolean),
  };
}

module.exports = { loadConfig };
