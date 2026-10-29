import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import ProductView from "./product-view";
import ProductSchema from "@/components/seo/product-schema";
import { fetchServerProduct } from "@/lib/server-catalogue";
import {
  absoluteUrl,
  categoryLabel,
  fetchSeoProduct,
  productDescription,
  productTitle,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/seo";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Resolve product pages on the server for every request. The catalogue fetch itself still uses a
 * five-minute Data Cache window, but keeping this segment out of the static/ISR fallback shell is
 * what allows a definite catalogue 404 to be returned as a real HTTP 404 instead of a streamed
 * soft-404 under an already-sent 200 status. Admin-created products also become reachable without
 * waiting for a rebuild.
 */
export const dynamic = "force-dynamic";

/** A readable fallback title derived from the URL — used only when the catalogue is unreachable. */
const labelFromSlug = (slug: string): string =>
  decodeURIComponent(slug)
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * Product metadata.
 *
 * The `fetch` here is memoised against the identical request `ProductSchema` makes, so one render
 * retrieves the product once. When the catalogue cannot be reached the page still gets an honest
 * title and description derived from the URL — but never a fabricated price, rating or availability,
 * which is why the Product JSON-LD is omitted in that case rather than guessed.
 */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchSeoProduct(slug);
  const canonical = absoluteUrl(`/product/${slug}`);

  if (!product) {
    // `fetchSeoProduct` collapses a real catalogue 404 and an API outage into the same `null`.
    // Resolve that distinction during metadata generation, before the streamed body can lock in a
    // 200 header: only a definite API 404 becomes HTTP 404, while an unavailable catalogue keeps
    // the honest slug-derived fallback below and lets the client recover.
    const existence = await fetchServerProduct(slug);
    if (existence.status === "not_found") notFound();

    const fallbackTitle = `${labelFromSlug(slug)} | ${SITE_NAME}`;
    const fallbackDescription = `${labelFromSlug(slug)} from ${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}, handcrafted in Demo City.`;
    return {
      title: { absolute: fallbackTitle },
      description: fallbackDescription,
      alternates: { canonical },
      openGraph: {
        type: "website",
        url: canonical,
        siteName: SITE_NAME,
        title: fallbackTitle,
        description: fallbackDescription,
        locale: "en_IN",
      },
      twitter: { card: "summary_large_image", title: fallbackTitle, description: fallbackDescription },
    };
  }

  const title = productTitle(product);
  const description = productDescription(product);

  return {
    // `absolute` opts out of the root layout's `%s | Demo Collection` template: `productTitle`
    // already brands (and de-duplicates) the title, so letting the template run would render
    // "Saree | Demo Collection | Demo Collection". This also keeps <title>, og:title and
    // twitter:title byte-identical.
    title: { absolute: title },
    description,
    // The catalogue's own SEO fields may carry keywords an editor chose deliberately.
    keywords: product.tags?.length ? product.tags : [product.category, product.fabric, product.craft].filter(Boolean) as string[],
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      locale: "en_IN",
      // No `images` here on purpose. `opengraph-image.tsx` in this folder generates a branded
      // 1200×630 card and emits the full tag set itself (og:image plus :type, :width, :height and
      // :alt, and the twitter equivalents). Setting `images` here would override that with a raw
      // catalogue photo of unknown aspect ratio — and with nothing at all for a product that has no
      // images, which is exactly when the generated text card matters most.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    other: {
      // Useful for category breadcrumbs in search consoles without inventing a schema type.
      "product:category": categoryLabel(product.category),
      ...(product.hsnCode ? { "product:hsn": product.hsnCode } : {}),
    },
  };
}

/**
 * A thin Server Component: it resolves `params`, hands the slug to the interactive client view, and
 * mounts the structured data. `title`, `description`, the canonical and the Open Graph tags are all
 * produced by `generateMetadata` above, so nothing is emitted here by hand.
 */
export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  // Resolve the product on the server: a definite API 404 becomes a real HTTP 404 (not a soft-404
  // rendered by client JS), a renamed product permanently redirects from its old slug, and a found
  // product is handed to the client view as initial data so the buy panel is in the first HTML.
  const result = await fetchServerProduct(slug);
  if (result.status === "not_found") notFound();
  const initialProduct = result.status === "found" ? result.product : null;
  if (initialProduct?.slug && initialProduct.slug !== slug) {
    permanentRedirect(`/product/${initialProduct.slug}`);
  }

  return (
    <>
      <ProductSchema slug={slug} />
      <ProductView slug={slug} initialProduct={initialProduct} />
    </>
  );
}
