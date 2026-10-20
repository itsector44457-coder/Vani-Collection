import type { Metadata } from "next";

/**
 * Metadata for auth and transactional routes.
 *
 * These pages are client components and cannot export metadata themselves, so each route gets a
 * thin server `layout.tsx` built on this helper. `robots.txt` alone cannot keep them out of the
 * index — a disallowed URL can still be listed from external links — which is why they carry an
 * explicit `noindex` (exactly like the /admin and /account layouts already do).
 */
export function privatePageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    // No canonical and no social cards: these URLs are per-shopper and must never be shared/indexed.
  };
}
