import { ImageResponse } from "next/og";
import { brandCard, OG_SIZE } from "@/components/seo/og-card";

/**
 * Site-wide social card.
 *
 * Statically optimised: nothing here depends on request-time data, so Next generates it once at
 * build and serves the cached PNG. It also doubles as the fallback card for any route that does not
 * define its own `opengraph-image`.
 */

export const alt = "Vani Collection — artisanal pure mul cotton and festive wear, handcrafted in Jaipur";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(brandCard(), { ...size });
}
