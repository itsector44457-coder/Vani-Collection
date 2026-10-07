/**
 * Shared Open Graph card artwork.
 *
 * These functions return plain JSX for `ImageResponse` (satori), which supports only a subset of
 * CSS: flexbox layouts, inline styles, solid colours, borders, border-radius and linear gradients.
 * No class names, no `box-shadow`, no `transform`, no grid — so the cards below stick to that
 * vocabulary and render identically at build time and at request time.
 *
 * The palette and the wine gradient are the same ones the storefront hero uses, so a shared link
 * looks like the site it points to.
 */

import type { ReactElement } from "react";
import { CATEGORIES, SITE_NAME, SITE_URL, SITE_TAGLINE, absoluteUrl, categoryLabel } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 } as const;

const INK = "#14100f";
const CREAM = "#faf7f2";
const GOLD = "#dfc28c";
const ROSE = "#881337";

/** The storefront's hero gradient — charcoal through saddle brown into deep wine. */
const WINE_GRADIENT = `linear-gradient(135deg, ${INK} 0%, #3d2012 46%, ${ROSE} 100%)`;

const frame = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  background: WINE_GRADIENT,
  padding: 56,
};

const innerFrame = {
  display: "flex",
  flexDirection: "column" as const,
  flex: 1,
  border: `2px solid rgba(223,194,140,0.42)`,
  borderRadius: 20,
  padding: 52,
};

const eyebrow = {
  display: "flex",
  color: GOLD,
  fontSize: 22,
  letterSpacing: 7,
  textTransform: "uppercase" as const,
};

const hostLabel = {
  display: "flex",
  color: GOLD,
  fontSize: 24,
  letterSpacing: 1.5,
};

/** Formats a rupee amount with Indian digit grouping, e.g. 1299 → ₹1,299. */
const inr = (value: number): string => `₹${Math.round(value).toLocaleString("en-IN")}`;

/** The site-wide card: used for the homepage and as the fallback whenever no product is known. */
export function brandCard(): ReactElement {
  return (
    <div style={frame}>
      <div style={innerFrame}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={eyebrow}>Handcrafted in Jaipur</span>
          <span style={{ display: "flex", width: 54, height: 54, borderRadius: 16, background: GOLD, alignItems: "center", justifyContent: "center", color: INK, fontSize: 34, fontWeight: 700 }}>
            V
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <span style={{ display: "flex", color: CREAM, fontSize: 96, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
            {SITE_NAME}
          </span>
          <span style={{ display: "flex", color: "rgba(250,247,242,0.74)", fontSize: 34, lineHeight: 1.35, marginTop: 18, maxWidth: 860 }}>
            {SITE_TAGLINE} — pure mul cotton, Bagru handblock prints and festive heirlooms.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {CATEGORIES.slice(0, 4).map((category) => (
            <span
              key={category.key}
              style={{
                display: "flex",
                border: `1px solid rgba(223,194,140,0.5)`,
                borderRadius: 999,
                padding: "10px 22px",
                color: GOLD,
                fontSize: 21,
              }}
            >
              {category.label}
            </span>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 34, borderTop: `1px solid rgba(223,194,140,0.28)`, paddingTop: 24 }}>
          <span style={hostLabel}>{SITE_URL.replace(/^https?:\/\//, "")}</span>
          <span style={{ display: "flex", color: "rgba(250,247,242,0.6)", fontSize: 21 }}>Free shipping over ₹1,999</span>
        </div>
      </div>
    </div>
  );
}

export interface ProductCardInput {
  name: string;
  category?: string;
  price?: number;
  mrp?: number;
  /** Pre-fetched image bytes. Passing them in (rather than a URL) keeps a slow CDN from failing the card. */
  image?: ArrayBuffer | null;
  fabric?: string;
}

/**
 * The product card. Falls back to the brand card when there is no real product — never renders an
 * invented price, because a shared link with a wrong number is worse than a plain brand card.
 */
export function productCard(input: ProductCardInput): ReactElement {
  if (!input.name) return brandCard();

  const hasImage = Boolean(input.image);
  const discounted = typeof input.price === "number" && typeof input.mrp === "number" && input.mrp > input.price;
  const discountPct = discounted && input.price ? Math.round(((input.mrp! - input.price) / input.mrp!) * 100) : 0;

  return (
    <div style={frame}>
      <div style={{ ...innerFrame, flexDirection: "row", gap: 44, padding: 0, overflow: "hidden" }}>
        {hasImage && (
          // eslint-disable-next-line @next/next/no-img-element -- satori rasterises this itself; next/image is not available inside ImageResponse.
          <img
            src={input.image as unknown as string}
            alt=""
            width={440}
            height={518}
            style={{ display: "flex", width: 440, height: 518, objectFit: "cover", borderRadius: 20, border: `1px solid rgba(223,194,140,0.3)` }}
          />
        )}

        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: 46 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ ...eyebrow, fontSize: 20, letterSpacing: 6 }}>{categoryLabel(input.category)}</span>
            <span style={{ display: "flex", color: "rgba(250,247,242,0.55)", fontSize: 18, letterSpacing: 2 }}>{SITE_NAME.toUpperCase()}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <span
              style={{
                display: "flex",
                color: CREAM,
                fontSize: hasImage ? 54 : 66,
                fontWeight: 700,
                lineHeight: 1.16,
                letterSpacing: -1,
              }}
            >
              {truncateForCard(input.name, hasImage ? 58 : 74)}
            </span>

            {input.fabric && (
              <span style={{ display: "flex", color: "rgba(250,247,242,0.66)", fontSize: 24, marginTop: 16, lineHeight: 1.4 }}>
                {truncateForCard(input.fabric, 64)}
              </span>
            )}

            {typeof input.price === "number" && input.price > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 26 }}>
                <span style={{ display: "flex", color: GOLD, fontSize: 46, fontWeight: 700 }}>{inr(input.price)}</span>
                {discounted && (
                  <>
                    <span style={{ display: "flex", color: "rgba(250,247,242,0.45)", fontSize: 26, textDecoration: "line-through" }}>
                      {inr(input.mrp!)}
                    </span>
                    <span style={{ display: "flex", background: GOLD, color: INK, borderRadius: 8, padding: "6px 14px", fontSize: 20, fontWeight: 700 }}>
                      {discountPct}% OFF
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid rgba(223,194,140,0.28)`, paddingTop: 20 }}>
            <span style={{ ...hostLabel, fontSize: 20 }}>{SITE_URL.replace(/^https?:\/\//, "")}</span>
            <span style={{ display: "flex", color: "rgba(250,247,242,0.6)", fontSize: 19 }}>Handcrafted · Ships in 2–3 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Card titles get one hard cut — satori does not do multi-line ellipsis. */
function truncateForCard(text: string, max: number): string {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Fetches image bytes for a card.
 *
 * Returns `null` on any failure so the caller can render a text-only card instead of letting a slow
 * or unreachable CDN turn the OG route into a 500. Capped at 4 MB and 6 s: the source only has to be
 * good enough to rasterise into a 440×518 box.
 */
export async function fetchCardImage(url: string | undefined | null): Promise<ArrayBuffer | null> {
  if (!url) return null;
  try {
    const response = await fetch(absoluteUrl(url), { signal: AbortSignal.timeout(6000), cache: "force-cache" });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "";
    if (type && !/^image\/(jpeg|jpg|png|webp|gif)/i.test(type)) return null;
    const buffer = await response.arrayBuffer();
    // satori has to decode this in-process; an oversized source just makes the card slow.
    if (buffer.byteLength === 0 || buffer.byteLength > 4 * 1024 * 1024) return null;
    return buffer;
  } catch {
    return null;
  }
}
