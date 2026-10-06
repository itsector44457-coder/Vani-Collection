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

  // Email. Provider agnostic: anything that speaks SMTP works (Gmail, Amazon SES, Resend,
  // Postmark, Zoho, Mailgun …). With EMAIL_ENABLED=false the API never throws — it logs the
  // intent and records a `skipped` EmailLog so the admin console stays auditable.
  EMAIL_ENABLED: bool,
  EMAIL_FROM: z.string().default('Vani Collection <care@vanicollection.com>'),
  EMAIL_REPLY_TO: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().max(65535).default(587),
  SMTP_SECURE: bool,
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** When true the fully rendered email is written to the log instead of being handed to SMTP. */
  EMAIL_DEV_CAPTURE: bool,
  EMAIL_LOGO_URL: z.string().optional(),
  /** Storefront origin used for links inside emails; falls back to the first CORS origin. */
  STOREFRONT_URL: z.string().optional(),
  SUPPORT_EMAIL: z.string().default('care@vanicollection.com'),

  // Loyalty. Pure internal bookkeeping with no external provider, so it is on by default and needs
  // no credentials — but every rate is configurable and the whole programme can be switched off.
  LOYALTY_ENABLED: z.string().optional().transform((v) => v !== 'false'),
  /** Rupees of delivered order value that earn one point. */
  LOYALTY_RUPEES_PER_POINT: z.coerce.number().positive().default(100),
  /** Rupees of checkout discount one point is worth. Redemption is always whole rupees. */
  LOYALTY_POINT_VALUE_RUPEES: z.coerce.number().positive().default(1),
  /** Smallest redemption accepted, in points — keeps ₹1 coupons out of the system. */
  LOYALTY_MIN_REDEMPTION_POINTS: z.coerce.number().int().nonnegative().default(100),
  /** Points may cover at most this share of an order, so a discount can never exceed the goods. */
  LOYALTY_MAX_REDEMPTION_PERCENT: z.coerce.number().min(0).max(100).default(50),
  /** How long earned points stay valid. */
  LOYALTY_EXPIRY_MONTHS: z.coerce.number().int().positive().default(12),
  /** Points awarded to BOTH the referrer and the referred shopper. */
  LOYALTY_REFERRAL_BONUS_POINTS: z.coerce.number().int().nonnegative().default(200),
  /** Lifetime-point thresholds for the two upper tiers; everything below Gold is Silver. */
  LOYALTY_TIER_GOLD_POINTS: z.coerce.number().int().nonnegative().default(1000),
  LOYALTY_TIER_PLATINUM_POINTS: z.coerce.number().int().nonnegative().default(5000),
  /** Days a redeemed coupon stays claimable at checkout before it lapses. */
  LOYALTY_COUPON_VALID_DAYS: z.coerce.number().int().positive().default(30),
});

function loadConfig() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  const corsOrigins = parsed.data.CORS_ORIGINS.split(',').map((v) => v.trim()).filter(Boolean);
  return {
    ...parsed.data,
    corsOrigins,
    // Links inside emails and the password-reset URL need one canonical storefront origin.
    storefrontUrl: (parsed.data.STOREFRONT_URL || corsOrigins[0] || 'http://localhost:3000').replace(/\/+$/, ''),
    /** SMTP is only usable with a host; EMAIL_ENABLED alone must not imply "configured". */
    emailConfigured: Boolean(parsed.data.EMAIL_ENABLED && parsed.data.SMTP_HOST),
    loyalty: {
      enabled: parsed.data.LOYALTY_ENABLED,
      rupeesPerPoint: parsed.data.LOYALTY_RUPEES_PER_POINT,
      pointValueRupees: parsed.data.LOYALTY_POINT_VALUE_RUPEES,
      minRedemptionPoints: parsed.data.LOYALTY_MIN_REDEMPTION_POINTS,
      maxRedemptionPercent: parsed.data.LOYALTY_MAX_REDEMPTION_PERCENT,
      expiryMonths: parsed.data.LOYALTY_EXPIRY_MONTHS,
      referralBonusPoints: parsed.data.LOYALTY_REFERRAL_BONUS_POINTS,
      couponValidDays: parsed.data.LOYALTY_COUPON_VALID_DAYS,
      // Ascending so a lookup can take the highest threshold the shopper has passed.
      tiers: [
        { name: 'silver', label: 'Silver', minLifetimePoints: 0 },
        { name: 'gold', label: 'Gold', minLifetimePoints: parsed.data.LOYALTY_TIER_GOLD_POINTS },
        { name: 'platinum', label: 'Platinum', minLifetimePoints: parsed.data.LOYALTY_TIER_PLATINUM_POINTS },
      ].sort((a, b) => a.minLifetimePoints - b.minLifetimePoints),
    },
  };
}

module.exports = { loadConfig };
