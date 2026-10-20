/**
 * Server-side catalogue reads for SSR/ISR first paint.
 *
 * Product grids and product pages used to render empty HTML and fill in from `useEffect` fetches in
 * the browser — crawlers (and shoppers on slow phones) saw a loading shell instead of the catalogue.
 * These helpers fetch the same public API during server rendering and hand the mapped storefront
 * products to the client views as initial data, so names, prices, photos and links are present in
 * the first byte of HTML while every interaction (cart, filters, size selection) stays client-side.
 *
 * Failure contract matches `lib/seo.ts`: an unreachable catalogue yields `null`, and callers fall
 * back to the previous client-fetch behaviour rather than rendering invented products.
 */

import { API_BASE } from "./api-client";
import { fetchCatalogue } from "./seo";
import { toStoreProduct } from "./storefront-api";
import type { Product } from "./storefront-types";

type ApiProduct = Parameters<typeof toStoreProduct>[0];

interface ProductListResponse {
  data: ApiProduct[];
  meta?: { page?: number; limit?: number; total?: number; pages?: number };
}

const mapRows = (rows: ApiProduct[] | undefined): Product[] =>
  (rows ?? []).filter((row) => row && row._id && Array.isArray(row.variants)).map(toStoreProduct);

/** One page of mapped storefront products, or `null` when the catalogue could not be reached. */
export async function fetchServerProducts(params: {
  category?: string;
  q?: string;
  limit?: number;
  page?: number;
  /** Follow pagination up to this many products (the listing filters client-side over the full set). */
  maxProducts?: number;
} = {}): Promise<{ products: Product[]; total: number; pages: number } | null> {
  const limit = Math.min(100, Math.max(1, params.limit ?? 60));
  const maxProducts = params.maxProducts ?? limit;
  const collected: ApiProduct[] = [];
  let total = 0;
  let pages = 1;

  for (let page = params.page ?? 1; collected.length < maxProducts; page += 1) {
    const query = new URLSearchParams({ limit: String(limit), page: String(page) });
    if (params.category && params.category !== "all") query.set("category", params.category);
    if (params.q) query.set("q", params.q);
    const response = await fetchCatalogue<ProductListResponse>(`/api/products?${query.toString()}`, 300);
    if (!response || !Array.isArray(response.data)) return collected.length ? { products: mapRows(collected), total, pages } : null;
    collected.push(...response.data);
    total = response.meta?.total ?? collected.length;
    pages = response.meta?.pages ?? 1;
    if (response.data.length === 0 || page >= pages) break;
  }

  return { products: mapRows(collected.slice(0, maxProducts)), total, pages };
}

export type ServerProductResult =
  | { status: "found"; product: Product }
  | { status: "not_found" }
  | { status: "unavailable" };

/**
 * One product with an honest outcome.
 *
 * Unlike `fetchCatalogue` (which collapses every failure into `null`), this distinguishes a real
 * API 404 — the storefront must answer a genuine HTTP 404 — from an unreachable backend, where the
 * page should degrade to client fetching rather than declaring a live product missing.
 */
export async function fetchServerProduct(slug: string): Promise<ServerProductResult> {
  if (!API_BASE) return { status: "unavailable" };
  try {
    const response = await fetch(`${API_BASE}/api/products/${encodeURIComponent(slug)}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 404) return { status: "not_found" };
    if (!response.ok) return { status: "unavailable" };
    const payload = (await response.json()) as { data?: ApiProduct };
    if (!payload?.data || !Array.isArray(payload.data.variants)) return { status: "unavailable" };
    return { status: "found", product: toStoreProduct(payload.data) };
  } catch {
    return { status: "unavailable" };
  }
}
