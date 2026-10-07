import type { MetadataRoute } from "next";
import { CATEGORIES, absoluteUrl, fetchSeoProducts, productImageUrls, STATIC_PAGES } from "@/lib/seo";

/**
 * Regenerate hourly rather than on every crawler hit. `sitemap.ts` is a cached Route Handler by
 * default, so without this the file would be frozen at whatever the build saw — and the build
 * usually runs before the catalogue is reachable.
 */
export const revalidate = 3600;

const parseDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * Crawlable URLs: the static marketing and policy pages, one entry per category, and every active
 * product.
 *
 * Built from the live catalogue so `lastmod` reflects a real edit and new products appear without a
 * deploy. When the API is unreachable the sitemap degrades to the static pages plus the known
 * category list — an incomplete-but-valid sitemap still crawls, whereas throwing here would serve
 * crawlers a 500 and drop the whole index.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchSeoProducts(5000);

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // Category entries are derived from the catalogue, falling back to the storefront's own taxonomy
  // so the listing pages stay in the sitemap even when no product has been tagged yet.
  const categories = new Map<string, Date | undefined>();
  for (const known of CATEGORIES) categories.set(known.key, undefined);
  for (const product of products) {
    if (!product.category) continue;
    const updated = parseDate(product.updatedAt) ?? parseDate(product.createdAt);
    const current = categories.get(product.category);
    if (updated && (!current || updated > current)) categories.set(product.category, updated);
  }

  const categoryEntries: MetadataRoute.Sitemap = Array.from(categories.entries()).map(([key, lastModified]) => ({
    url: absoluteUrl(`/products?category=${encodeURIComponent(key)}`),
    lastModified: lastModified ?? new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const productEntries: MetadataRoute.Sitemap = products
    .filter((product) => product.slug && product.status !== "archived")
    .map((product) => {
      // Google's image sitemap extension — capped so a photo-heavy product cannot bloat the file.
      const images = productImageUrls(product).slice(0, 5);
      return {
        url: absoluteUrl(`/product/${product.slug}`),
        lastModified: parseDate(product.updatedAt) ?? parseDate(product.createdAt) ?? new Date(),
        changeFrequency: "weekly" as const,
        priority: product.featured ? 0.9 : 0.8,
        ...(images.length ? { images } : {}),
      };
    });

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
