/**
 * Pure schema.org builders.
 *
 * No fetching and no React in here, so every shape can be unit-reasoned about and reused from
 * `generateMetadata`, the sitemap and the OG images. Each builder returns `null` when it does not
 * have enough *real* data to make an honest claim — callers drop nulls rather than emitting a stub.
 */

import { compact, type JsonLdValue } from "./json-ld";
import {
  absoluteUrl,
  categoryLabel,
  INSTAGRAM_URL,
  ORG_ADDRESS,
  productDescription,
  productImageUrls,
  SITE_LEGAL_NAME,
  SITE_LOCALE,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
  availabilityFromInventory,
  lowestVariant,
  priceValidUntil,
  type SeoProduct,
  type SeoReview,
  type SeoReviewSummary,
} from "@/lib/seo";

/* ------------------------------------------------------------- Organization */

export function organizationSchema(): JsonLdValue {
  return compact({
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    legalName: SITE_LEGAL_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/favicon.svg"),
    },
    email: SUPPORT_EMAIL,
    description: "Handcrafted pure mul cotton, Bagru handblock prints and festive heirlooms from a family atelier in Jaipur.",
    address: compact({
      "@type": "PostalAddress",
      streetAddress: ORG_ADDRESS.streetAddress,
      addressLocality: ORG_ADDRESS.addressLocality,
      addressRegion: ORG_ADDRESS.addressRegion,
      addressCountry: ORG_ADDRESS.addressCountry,
    }),
    sameAs: [INSTAGRAM_URL],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: SUPPORT_EMAIL,
      availableLanguage: ["English", "Hindi"],
      areaServed: "IN",
    },
  });
}

/* ------------------------------------------------------------------- WebSite */

/** WebSite + SearchAction so Google can surface a sitelinks search box for `/products?search=`. */
export function websiteSchema(): JsonLdValue {
  return compact({
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: "Artisanal pure mul cotton and festive wear, handcrafted in Jaipur.",
    inLanguage: SITE_LOCALE,
    publisher: { "@id": `${SITE_URL}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

/* ------------------------------------------------------------- BreadcrumbList */

export interface BreadcrumbEntry {
  name: string;
  path: string;
}

/**
 * BreadcrumbList. The last crumb is a real URL too — Google renders the final item as the page
 * title, and omitting `item` on it is the documented way to mark "you are here".
 */
export function breadcrumbSchema(entries: BreadcrumbEntry[]): JsonLdValue | null {
  const items = entries.filter((entry) => entry.name);
  if (items.length === 0) return null;
  return compact({
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, index) => {
      const last = index === items.length - 1;
      return compact({
        "@type": "ListItem",
        position: index + 1,
        name: entry.name,
        item: last ? undefined : absoluteUrl(entry.path),
      });
    }),
  });
}

/** Home → Products → Category → Product, the trail the product page also renders visually. */
export function productBreadcrumbSchema(product: SeoProduct): BreadcrumbEntry[] {
  return [
    { name: "Home", path: "/" },
    { name: "Our Collection", path: "/products" },
    { name: categoryLabel(product.category), path: `/products?category=${encodeURIComponent(product.category)}` },
    { name: product.name, path: `/product/${product.slug}` },
  ];
}

/* ------------------------------------------------------------------ AggregateRating */

/**
 * AggregateRating from `/api/reviews/summary/:productId`.
 *
 * Returns `null` when there are no published reviews: an `aggregateRating` with `reviewCount: 0`
 * is exactly the kind of self-serving markup Google's spam policies target.
 */
export function aggregateRatingSchema(summary: SeoReviewSummary | null): JsonLdValue | null {
  if (!summary || !summary.count || !(summary.average > 0)) return null;
  return compact({
    "@type": "AggregateRating",
    ratingValue: Math.round(summary.average * 10) / 10,
    reviewCount: summary.count,
    bestRating: 5,
    worstRating: 1,
  });
}

/** Individual `Review` nodes from the published reviews actually rendered on the page. */
export function reviewListSchema(reviews: SeoReview[]): JsonLdValue[] {
  return reviews.slice(0, 5).map((review) =>
    compact({
      "@type": "Review",
      author: compact({ "@type": "Person", name: review.customerName || "Verified Buyer" }),
      datePublished: review.createdAt ? new Date(review.createdAt).toISOString().slice(0, 10) : undefined,
      name: review.title || undefined,
      reviewBody: review.body || undefined,
      reviewRating: compact({
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      }),
    })
  );
}

/* ---------------------------------------------------------------------- Product */

export interface ProductSchemaInput {
  product: SeoProduct;
  reviewSummary?: SeoReviewSummary | null;
  reviews?: SeoReview[];
}

/**
 * Product with Offer(s), INR pricing and availability taken from **real** inventory.
 *
 * Two deliberate omissions, both to avoid asserting something unverified:
 * - `availability` is left out entirely when the API returned no inventory rows for the product's
 *   SKUs. Guessing `InStock` is a rich-result violation; saying nothing simply forfeits the badge.
 * - `aggregateRating` is left out when nothing is published yet.
 *
 * When variant prices differ the offer becomes an `AggregateOffer` carrying the real low/high, so
 * the price Google shows is one a shopper can actually pay.
 */
export function productSchema({ product, reviewSummary = null, reviews = [] }: ProductSchemaInput): JsonLdValue | null {
  const images = productImageUrls(product);
  const url = absoluteUrl(`/product/${product.slug}`);
  const validUntil = priceValidUntil(product);
  const activeVariants = (product.variants ?? []).filter((variant) => variant.active !== false);
  const pool = activeVariants.length ? activeVariants : product.variants ?? [];
  const cheapest = lowestVariant(product);
  if (!cheapest || cheapest.price <= 0) return null;

  const availability = availabilityFromInventory(product.inventory, product.variants ?? []);
  const prices = pool.map((variant) => variant.price);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const singlePrice = lowPrice === highPrice;

  const seller = { "@type": "Organization" as const, name: SITE_NAME };

  const offers: JsonLdValue = singlePrice
    ? compact({
        "@type": "Offer",
        url,
        price: lowPrice.toFixed(2),
        priceCurrency: "INR",
        priceValidUntil: validUntil,
        availability: availability ?? undefined,
        itemCondition: "https://schema.org/NewCondition",
        seller,
      })
    : compact({
        "@type": "AggregateOffer",
        lowPrice: lowPrice.toFixed(2),
        highPrice: highPrice.toFixed(2),
        offerCount: pool.length,
        priceCurrency: "INR",
        availability: availability ?? undefined,
        offers: pool.slice(0, 20).map((variant) =>
          compact({
            "@type": "Offer",
            url,
            sku: variant.sku,
            name: [product.name, variant.size, variant.color].filter(Boolean).join(" · "),
            price: variant.price.toFixed(2),
            priceCurrency: "INR",
            priceValidUntil: validUntil,
            availability: availabilityFromInventory(product.inventory, [variant]) ?? undefined,
            itemCondition: "https://schema.org/NewCondition",
            seller,
          })
        ),
      });

  return compact({
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    productID: product._id,
    sku: singlePrice ? pool[0]?.sku : undefined,
    description: productDescription(product),
    image: images.length ? images : undefined,
    url,
    brand: compact({
      "@type": "Brand",
      name: product.brand || SITE_NAME,
    }),
    category: categoryLabel(product.category),
    material: product.fabric || undefined,
    additionalProperty: [
      product.craft ? { "@type": "PropertyValue", name: "Craft", value: product.craft } : null,
      product.hsnCode ? { "@type": "PropertyValue", name: "HSN code", value: product.hsnCode } : null,
    ].filter(Boolean) as JsonLdValue[],
    aggregateRating: aggregateRatingSchema(reviewSummary) ?? undefined,
    review: reviewListSchema(reviews),
    offers,
  });
}

/* -------------------------------------------------------------------- FAQPage */

export interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * FAQPage. Only emitted where the questions and answers are genuinely rendered on the page —
 * invisible FAQ markup is a spam signal, so `null` is returned for an empty list.
 */
export function faqSchema(entries: FaqEntry[]): JsonLdValue | null {
  const items = entries.filter((entry) => entry.question.trim() && entry.answer.trim());
  if (items.length === 0) return null;
  return compact({
    "@type": "FAQPage",
    mainEntity: items.map((entry) =>
      compact({
        "@type": "Question",
        name: entry.question,
        acceptedAnswer: compact({ "@type": "Answer", text: entry.answer }),
      })
    ),
  });
}

/* --------------------------------------------------------------- WebPage types */

/** CollectionPage for `/products` and its category filters. */
export function collectionPageSchema(title: string, description: string, path: string, productNames: string[] = []): JsonLdValue {
  const url = absoluteUrl(path);
  return compact({
    "@type": "CollectionPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: SITE_LOCALE,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    breadcrumb: breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: title, path },
    ]) ?? undefined,
    hasPart: productNames.slice(0, 30).map((name) => compact({ "@type": "Product", name })),
  });
}

/** ItemPage wrapper for a product URL, tying it back to the WebSite and Organization nodes. */
export function itemPageSchema(product: SeoProduct, title: string, description: string): JsonLdValue {
  const url = absoluteUrl(`/product/${product.slug}`);
  return compact({
    "@type": "ItemPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: SITE_LOCALE,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${url}#product` },
    breadcrumb: breadcrumbSchema(productBreadcrumbSchema(product)) ?? undefined,
  });
}
