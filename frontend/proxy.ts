import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/+$/, "");

/**
 * Product existence gate.
 *
 * Product pages stream behind loading boundaries, so a `notFound()` thrown during render can only
 * swap the streamed segment — the HTTP status has already been sent as 200. This tiny pre-render
 * probe uses the backend's slug-only endpoint to make the two status-sensitive decisions before
 * streaming starts: a definite missing product is rewritten to the app's real 404 route, and a
 * previous slug receives a real permanent redirect to the canonical product URL.
 *
 * Every uncertain outcome (API unset, timeout, 5xx, malformed payload) falls through to the page.
 * That preserves the storefront's outage behaviour: render/fallback rather than declaring a live
 * product missing just because the catalogue could not be reached quickly.
 */
export async function proxy(request: NextRequest) {
  if (!API_BASE || !["GET", "HEAD"].includes(request.method)) return NextResponse.next();

  // Prefetches only warm the client router; the eventual document/RSC navigation still passes here.
  if (request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch") {
    return NextResponse.next();
  }

  const encodedSlug = request.nextUrl.pathname.split("/").filter(Boolean)[1];
  if (!encodedSlug) return NextResponse.next();

  let slug = encodedSlug;
  try {
    slug = decodeURIComponent(encodedSlug);
  } catch {
    return NextResponse.next();
  }

  try {
    const response = await fetch(`${API_BASE}/api/products/exists/${encodeURIComponent(slug)}`, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });

    if (response.status === 404) {
      return NextResponse.rewrite(new URL("/_not-found", request.url));
    }
    if (!response.ok) return NextResponse.next();

    const payload = (await response.json().catch(() => null)) as { data?: { slug?: unknown } } | null;
    const canonicalSlug = typeof payload?.data?.slug === "string" ? payload.data.slug : "";
    if (canonicalSlug && canonicalSlug !== slug) {
      const destination = new URL(`/product/${encodeURIComponent(canonicalSlug)}`, request.url);
      destination.search = request.nextUrl.search;
      return NextResponse.redirect(destination, 308);
    }
  } catch {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/product/:slug",
};
