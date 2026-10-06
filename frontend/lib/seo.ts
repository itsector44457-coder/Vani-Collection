/**
 * Server-side SEO helpers.
 *
 * Everything here runs in Server Components, `generateMetadata`, `sitemap.ts`, `robots.ts` and the
 * `opengraph-image.tsx` routes — never in the browser. The rule throughout is the same one the
 * backend follows: **if the catalogue is unreachable, degrade instead of guessing.** A sitemap with
 * only the static pages still crawls; a `Product` schema with an invented `availability` or a stale
 * `priceValidUntil` gets a manual action.
 */

import { API_BASE } from "./api-client";

export const SITE_NAME = "Vani Collection";
export const SITE_LEGAL_NAME = "Vani Collection Atelier";
export const SITE_TAGLINE = "Artisanal Pure Mul Cotton & Festive Wear";

/**
 * Canonical origin for every absolute URL we publish (canonicals, Open Graph, sitemap, JSON-LD).
 * Override with `NEXT_PUBLIC_SITE_URL` per environment; the fallback matches the customer-facing
 * inbox the storefront already advertises (`care@vanicollection.com`).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.vanicollection.com").replace(/\/+$/, "");

export const SITE_LOCALE = "en_IN";
export const SITE_CURRENCY = "INR";
export const SUPPORT_EMAIL = "care@vanicollection.com";
export const INSTAGRAM_URL = "https://www.instagram.com/vanicollection_jaipur";

/** Physical address published in the Organization schema — matches the privacy policy. */
export const ORG_ADDRESS = {
  streetAddress: "Vani Collection Atelier",
  addressLocality: "Guna",
  addressRegion: "Madhya Pradesh",
  addressCountry: "IN",
};

/** Joins a path onto the canonical origin, tolerating a path that is already absolute. */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

/* ------------------------------------------------------------------ taxonomy */

/** Category keys the storefront filters on, with their display names. */
export const CATEGORIES = [
  { key: "mul-cotton", label: "Mul Cotton" },
  { key: "festive", label: "Festive Edit" },
  { key: "coord-sets", label: "Co-ord Sets" },
  { key: "anarkalis", label: "Anarkalis" },
] as const;

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

/** Human label for a category key, falling back to title-casing the slug. */
export function categoryLabel(key?: string): string {
  if (!key) return "All Products";
  if (CATEGORY_LABELS[key]) return CATEGORY_LABELS[key];
  return key
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Canonical URL for a category listing. */
export const categoryUrl = (key: string): string => absoluteUrl(`/products?category=${encodeURIComponent(key)}`);

/* --------------------------------------------------------------- static pages */

/**
 * Non-catalogue pages worth crawling. Auth and transactional routes are deliberately absent:
 * `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/checkout` and `/order-confirmation`
 * are thin, duplicate-prone and (for checkout) blocked in robots.txt anyway.
 */
export const STATIC_PAGES: { path: string; changeFrequency: "daily" | "weekly" | "monthly" | "yearly"; priority: number; label: string }[] = [
  { path: "/", changeFrequency: "daily", priority: 1, label: "Home" },
  { path: "/products", changeFrequency: "daily", priority: 0.9, label: "Our Collection" },
  { path: "/reels", changeFrequency: "weekly", priority: 0.6, label: "Reels" },
  { path: "/size-guide", changeFrequency: "monthly", priority: 0.6, label: "Size Guide" },
  { path: "/shipping", changeFrequency: "monthly", priority: 0.6, label: "Shipping & Delivery" },
  { path: "/returns", changeFrequency: "monthly", priority: 0.6, label: "Returns & Exchanges" },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3, label: "Privacy Policy" },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3, label: "Terms & Conditions" },
];

/** Paths a crawler should never index — mirrored exactly in `app/robots.ts`. */
export const DISALLOWED_PREFIXES = ["/admin", "/account", "/checkout", "/api", "/order-confirmation", "/login", "/signup", "/forgot-password", "/reset-password"];

/* ------------------------------------------------------------------- fetching */

/**
 * Reads JSON from the catalogue API during server rendering.
 *
 * Returns `null` on every failure mode — unset API URL, DNS, timeout, 404, 500, malformed JSON —
 * because a crawler hitting `/product/x` must still get a rendered page and valid metadata when the
 * backend is down. Callers decide what the degraded output looks like.
 */
export async function fetchCatalogue<T>(path: string, revalidateSeconds = 300): Promise<T | null> {
  if (!API_BASE) return null;
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      next: { revalidate: revalidateSeconds },
      // A hung backend must not hang the render; 8s is well inside any sane server timeout.
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- API shapes */

export interface SeoVariant {
  sku: string;
  size?: string;
  color?: string;
  price: number;
  mrp: number;
  active?: boolean;
}

export interface SeoImage {
  url: string;
  alt?: string;
  position?: number;
}

/** The subset of `GET /api/products/:slug` (and the list endpoint) that SEO needs. */
export interface SeoProduct {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  fabric?: string;
  craft?: string;
  hsnCode?: string;
  gstRate?: number;
  images?: SeoImage[];
  variants: SeoVariant[];
  tags?: string[];
  badges?: string[];
  featured?: boolean;
  status?: string;
  seo?: { title?: string; description?: string };
  /** Only the single-product endpoint returns this: `{ [sku]: available }`. */
  inventory?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

interface ProductListResponse {
  data: SeoProduct[];
  meta?: { page?: number; limit?: number; total?: number; pages?: number };
}

/** Fetches one product with its real inventory map. `null` when unknown or unreachable. */
export async function fetchSeoProduct(slug: string): Promise<SeoProduct | null> {
  const response = await fetchCatalogue<{ data: SeoProduct }>(`/api/products/${encodeURIComponent(slug)}`);
  return response?.data ?? null;
}

/**
 * Fetches catalogue products for the sitemap and category metadata.
 *
 * Walks every page so a catalogue larger than the API's 100-per-page cap is still fully listed —
 * a sitemap that quietly drops products is worse than no sitemap at all.
 */
export async function fetchSeoProducts(limit = 500): Promise<SeoProduct[]> {
  const collected: SeoProduct[] = [];
  const perPage = 100;
  for (let page = 1; collected.length < limit; page += 1) {
    const response = await fetchCatalogue<ProductListResponse>(`/api/products?limit=${perPage}&page=${page}`, 3600);
    const rows = response?.data ?? [];
    collected.push(...rows);
    const pages = response?.meta?.pages ?? 1;
    if (rows.length === 0 || page >= pages) break;
  }
  return collected.slice(0, limit);
}

/**
 * Products in one category, for the CollectionPage schema and category metadata.
 * Pass no category for the unfiltered listing.
 */
export async function fetchSeoCategory(category?: string, limit = 30): Promise<SeoProduct[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (category && category !== "all") query.set("category", category);
  const response = await fetchCatalogue<ProductListResponse>(`/api/products?${query.toString()}`, 600);
  return response?.data ?? [];
}

/** `GET /api/reviews/summary/:productId` — the published-review aggregate behind AggregateRating. */
export interface SeoReviewSummary {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

/** A published review as returned by `GET /api/reviews/product/:productId`. */
export interface SeoReview {
  _id: string;
  productId: string;
  customerName: string;
  rating: number;
  title?: string;
  body: string;
  verifiedPurchase?: boolean;
  helpfulCount?: number;
  createdAt?: string;
}

export async function fetchSeoReviewSummary(productId: string): Promise<SeoReviewSummary | null> {
  const response = await fetchCatalogue<{ data: SeoReviewSummary }>(`/api/reviews/summary/${encodeURIComponent(productId)}`);
  const summary = response?.data;
  // The endpoint returns zeros for a product with no published reviews; that is not an aggregate.
  if (!summary || !summary.count) return null;
  return summary;
}

/**
 * The published reviews the product page actually renders, for the `review` nodes in the Product
 * schema. Marking up reviews that are not on the page is a spam violation, so this endpoint — the
 * same one `ProductReviews` uses — is the only acceptable source.
 */
export async function fetchSeoReviews(productId: string, limit = 5): Promise<SeoReview[]> {
  const response = await fetchCatalogue<{ data: SeoReview[] }>(`/api/reviews/product/${encodeURIComponent(productId)}`);
  const rows = response?.data ?? [];
  // Most-helpful first, newest as the tiebreak: the markup should mirror what a reader sees.
  return rows
    .slice()
    .sort((a, b) => (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0))
    .slice(0, limit);
}

/* ----------------------------------------------------------------- formatting */

/** Trims to a whole number of characters on a word boundary — used for meta descriptions. */
export function truncate(text: string | undefined, max = 158): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : max).replace(/[,;.\s]+$/, "")}…`;
}

/**
 * A real, stable `priceValidUntil` date.
 *
 * Derived from the product's own `updatedAt` rather than `Date.now()`, so the value does not change
 * on every crawl (an unstable date makes rich results flap) and it always sits in the future.
 */
export function priceValidUntil(product: Pick<SeoProduct, "updatedAt" | "createdAt">): string {
  const anchor = new Date(product.updatedAt || product.createdAt || Date.now());
  const base = Number.isNaN(anchor.getTime()) ? new Date() : anchor;
  const until = new Date(base.getTime());
  until.setUTCFullYear(until.getUTCFullYear() + 1);
  // Never publish a date in the past even if the record is years old.
  if (until.getTime() < Date.now()) return new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  return until.toISOString().slice(0, 10);
}

/**
 * schema.org availability from **real** stock only.
 *
 * Returns `null` when the inventory map is absent — the caller must then omit the `Offer` rather
 * than assert an availability nobody verified. `0` across every variant is a genuine `OutOfStock`.
 */
export function availabilityFromInventory(inventory?: Record<string, number>, variants: SeoVariant[] = []): string | null {
  if (!inventory || typeof inventory !== "object") return null;
  const skus = variants.length ? variants.map((variant) => variant.sku) : Object.keys(inventory);
  if (skus.length === 0) return null;
  // Only count SKUs the API actually reported; a missing key is unknown, not zero.
  const known = skus.filter((sku) => typeof inventory[sku] === "number");
  if (known.length === 0) return null;
  const total = known.reduce((sum, sku) => sum + Math.max(0, inventory[sku]), 0);
  return total > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
}

/** Cheapest active variant — the price Google shows in the listing. */
export function lowestVariant(product: SeoProduct): SeoVariant | null {
  const active = product.variants?.filter((variant) => variant.active !== false) ?? [];
  const pool = active.length ? active : product.variants ?? [];
  if (!pool.length) return null;
  return pool.reduce((best, variant) => (variant.price < best.price ? variant : best), pool[0]);
}

/** Product images in their stored order, as absolute URLs. */
export function productImageUrls(product: SeoProduct): string[] {
  return (product.images ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((image) => image.url)
    .filter((url): url is string => Boolean(url))
    .map((url) => absoluteUrl(url));
}

/** Meta description for a product: the CMS override wins, then the long copy, then the short. */
export function productDescription(product: SeoProduct): string {
  return truncate(product.seo?.description || product.description || product.shortDescription || `${product.name} — handcrafted by ${SITE_LEGAL_NAME}, Jaipur.`, 158);
}

/** `<title>` for a product: the CMS override wins, then the product name plus the brand. */
export function productTitle(product: SeoProduct): string {
  const base = product.seo?.title?.trim() || product.name;
  const withBrand = base.toLowerCase().includes(SITE_NAME.toLowerCase()) ? base : `${base} | ${SITE_NAME}`;
  return truncate(withBrand, 65).replace(/…$/, "");
}
