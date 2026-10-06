import type { MetadataRoute } from "next";
import { absoluteUrl, DISALLOWED_PREFIXES, SITE_URL } from "@/lib/seo";

/**
 * Crawler policy.
 *
 * The whole storefront is open; the admin console, the signed-in account area, checkout and the API
 * are not — indexing those burns crawl budget on pages that are either private or thin duplicates
 * of what a shopper already sees.
 *
 * `DISALLOWED_PREFIXES` is shared with `lib/seo.ts` so the blocklist and the sitemap can never drift
 * apart: nothing the sitemap advertises is disallowed here.
 *
 * This file is a cached Route Handler and needs no request-time data — `SITE_URL` is inlined at
 * build time, so the cached copy is correct until the next deploy.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PREFIXES.map((prefix) => `${prefix.replace(/\/$/, "")}/`),
      },
      {
        // Explicitly invite the image and social crawlers that render Open Graph cards; the
        // disallow list above already keeps them out of the private areas.
        userAgent: ["Googlebot", "Googlebot-Image", "Bingbot", "DuckDuckBot", "Applebot", "facebookexternalhit", "Twitterbot", "LinkedInBot"],
        allow: "/",
        disallow: DISALLOWED_PREFIXES.map((prefix) => `${prefix.replace(/\/$/, "")}/`),
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}
