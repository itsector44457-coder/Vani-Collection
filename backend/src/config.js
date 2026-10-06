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

  // GST invoice. Everything has a default except the GSTIN itself: without a registered seller GSTIN
  // the invoice is still generated and clearly marked, rather than printing a fabricated number.
  SELLER_GSTIN: z.string().trim().optional().transform((value) => value || undefined).refine(
    (value) => !value || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(value),
    'SELLER_GSTIN must be a valid 15-character GSTIN'
  ),
  SELLER_PAN: z.string().trim().optional().transform((value) => value || undefined).refine(
    (value) => !value || /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value),
    'SELLER_PAN must be a valid 10-character PAN'
  ),
  SELLER_LEGAL_NAME: z.string().default('Vani Collection'),
  SELLER_ADDRESS: z.string().default('Vani Collection Atelier, Guna, Madhya Pradesh 473001, India'),
  /** State the goods are supplied from — decides CGST+SGST versus IGST. Defaults to the GSTIN's state. */
  SELLER_STATE: z.string().optional(),
  SELLER_STATE_CODE: z.string().trim().optional().transform((value) => value || undefined).refine(
    (value) => !value || /^[0-9]{2}$/.test(value),
    'SELLER_STATE_CODE must be a two-digit state code'
  ),
  SELLER_PHONE: z.string().optional(),
  SELLER_EMAIL: z.string().default('care@vanicollection.com'),
  /**
   * Optional TrueType font to embed. Left unset on purpose — see `services/invoice.js`: the built-in
   * Helvetica cannot encode U+20B9 and renders ₹ as a superscript one, so the default output writes
   * "Rs." and needs no font file at all.
   */
  INVOICE_FONT_PATH: z.string().optional(),
  /** Bold companion to the above. Falls back to the regular face when unset (pdfkit cannot fake bold). */
  INVOICE_FONT_BOLD_PATH: z.string().optional(),
});

/** Indian state codes as printed in characters 1–2 of a GSTIN. */
const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra',
  '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
  '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

/**
 * Normalises the seller's identity for the invoice.
 *
 * The state code and PAN are read off the GSTIN when they are not set explicitly — a GSTIN is
 * `<2-digit state code><10-char PAN><entity><Z><checksum>`, so deriving them keeps the three values
 * from disagreeing with each other on a document an accountant will check.
 */
function buildSeller(env) {
  const gstin = (env.SELLER_GSTIN || '').trim().toUpperCase() || undefined;
  const validGstin = gstin && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(gstin) ? gstin : undefined;
  const stateCode = (env.SELLER_STATE_CODE || '').trim() || (validGstin ? validGstin.slice(0, 2) : undefined);
  return {
    gstin: validGstin,
    // A malformed GSTIN is never printed: an invalid registration number on a tax invoice is worse
    // than an obviously blank one, so it is dropped and the document is marked unregistered.
    gstinRejected: Boolean(gstin) && !validGstin,
    pan: (env.SELLER_PAN || '').trim().toUpperCase() || (validGstin ? validGstin.slice(2, 12) : undefined),
    legalName: env.SELLER_LEGAL_NAME,
    address: env.SELLER_ADDRESS,
    stateCode,
    state: (env.SELLER_STATE || '').trim() || (stateCode ? GST_STATE_CODES[stateCode] : undefined),
    phone: env.SELLER_PHONE || undefined,
    email: env.SELLER_EMAIL,
    fontPath: env.INVOICE_FONT_PATH || undefined,
    fontBoldPath: env.INVOICE_FONT_BOLD_PATH || undefined,
  };
}

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
    seller: buildSeller(parsed.data),
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
